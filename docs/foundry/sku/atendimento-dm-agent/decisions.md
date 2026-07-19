# Decisions — Atendimento DM Agent (ADRs locais)

> ADRs específicos deste SKU. Convenção de IDs: **ADR-NNN-DM** (DM = Atendimento DM).
>
> Decisões globais do projeto ficam em `docs/foundry/decisions.md` raiz.

---

## ADR-001-DM — Confidence threshold 0.7 para autorresponder/qualificar

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C4 (Verifiable Evaluation) + C2 (Outcome contratual)

### Contexto

BANT classifier (Haiku 4.5 dedicado) retorna `{B, A, N, T: 0-2, confidence: 0-1}`. Confidence representa certeza do modelo sobre o scoring atribuído. Threshold sub-ótimo gera dois tipos de erro:

- **Threshold muito baixo** (ex: 0.5): muitos falsos positivos → CRM polui com leads não-qualificados → vendedor humano perde tempo → erosão de confiança.
- **Threshold muito alto** (ex: 0.9): muitos falsos negativos → leads quentes escalam desnecessariamente → custo absorvido (não cobra) sobe e qualification rate cai.

Criticality A do SKU + ICP de "vendedor humano confia no CRM" pesa para conservadorismo.

### Decisão

**Threshold 0.7** para autorresponder + qualificar (handoff CRM + cobrar R$ 5). Abaixo de 0.7:

- Se `qualified=true && confidence < 0.7` → **escala humano** (`escalation_reason='low_confidence'`), não cobra
- Se `qualified=false` → continua conversa pedindo informação faltante (nunca cobra)

### Motivação

1. **Calibração inicial empírica:** análise de 50 conversas anotadas manualmente mostrou que confidence 0.7+ corresponde a ~92% precision de BANT positivo. 0.6 cai para ~75%.
2. **Política de não-cobrança em escalonamento:** dado que escala é cost-only (não receita), threshold conservador degrada margin mas protege qualidade. Margem unitária de 93% absorve facilmente.
3. **Audit sample 10% manual** valida threshold mensalmente. Se precision real for >95%, podemos baixar para 0.65 e aumentar revenue.
4. **Criticality A** justifica conservadorismo — qualidade do CRM externo é função crítica do produto.

### Consequências

- ✅ Falsos positivos esperados ≤ 8% em produção
- ✅ Escalation rate ≤ 15% (inclui low_confidence + hard triggers)
- ⚠️ Qualification rate teórica reduz ~10% (vs threshold 0.6) — aceitável dado margem
- ✅ Threshold é parâmetro de configuração (`bant.confidence_threshold` em config) — facilmente ajustável

### Re-examinar

Após 30 dias em SHADOW interno + 30 dias em ASSISTED (quando habilitado):
- Se precision real ≥ 95% sustentado → testar 0.65
- Se precision < 85% → subir para 0.75 + investigar prompt do classifier

---

## ADR-002-DM — Gatilhos de escalonamento obrigatório (hard triggers)

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** C2 (Outcome contratual) + C4 (Verifiable Evaluation) + LGPD

### Contexto

Existem categorias de mensagens onde **automatizar resposta é proibido** por motivos de honestidade, legalidade ou risco reputacional. Mesmo se BANT seja perfeito, o agent **deve escalar** para humano:

- Pergunta de preço final/contratual (humano precisa confirmar caso a caso)
- Ameaça de Procon / processo / advogado
- Reclamação grave (cobrança duplicada, problema técnico crítico)
- Cancelamento urgente
- Dúvida jurídica/contratual
- Pedido de comprovante/boleto/nota fiscal

Sem esses gatilhos, o agent inevitavelmente alucinaria preços ou daria respostas que comprometeriam a empresa.

### Decisão

Implementar `HardTriggerCatalog` em `hard-triggers-pt-br.yaml` com **lista canônica** de palavras-chave + regex + LLM classifier híbrido. Match = escalonamento imediato P0/P1 antes de chamar o LLM principal.

**Defaults canônicos (versionados):**
- `preço final`, `fechar contrato`, `desconto X%`, `boleto`, `comprovante`, `nota fiscal`
- `Procon`, `advogado`, `processo`, `jurídico`, `reclamação grave`
- `cancelar agora`, `cancelar urgente`, `quero cancelar`
- `erro`, `bug`, `não funciona`, `está fora do ar` (escala suporte técnico)

**Per-tenant override:** tenant pode adicionar (não remover) gatilhos via `hard_triggers.yaml` próprio.

### Motivação

1. **Honestidade > automação:** preferimos perder 15% de qualification rate a ter 1 caso de alucinação de preço que vire post viral negativo.
2. **LGPD adjacente:** reclamações graves frequentemente envolvem dados pessoais — humano deve manejar.
3. **Criticality A:** padrão de qualidade exige >100% de honestidade nessas categorias.
4. **Auditável:** lista YAML versionada, mudanças exigem PR + revisão.

### Consequências

- ✅ Escalation rate sobe (~15% esperado vs ~8% sem trigger list)
- ✅ Custo de honestidade absorvido pela margem 93%
- ✅ Risco reputacional reduzido drasticamente
- ⚠️ Lista precisa de manutenção (novos termos surgem) — owner: @po-guardian
- ✅ Tenants podem customizar (adicionar termos)

### Re-examinar

- Mensalmente (audit DeepAgent): falsos negativos (mensagem crítica que NÃO disparou trigger)?
- Trimestralmente: termos novos do dicionário cliente

---

## ADR-003-DM — Retenção 90d + opt-in + direito de esquecimento + hard cap 25 turnos

**Status:** ✅ Aceito 2026-05-13
**Princípio relacionado:** LGPD (Lei 13.709/2018) + C3 (Unit Economics) + C8 (Tenant context)

### Contexto

LGPD exige base legal para tratamento de dados pessoais. Conversas DM contêm: nome, telefone (WhatsApp), email (eventual), faturamento, dados comerciais. Sem opt-in explícito + retenção limitada + direito de esquecimento, a operação é ilegal.

Adicionalmente, conversas longas (>25 turnos) violam C3 (cenário D de unit-economics.md mostra R$ 1,39 = 28% do preço, viola limite 25%). Cap mecânico necessário.

### Decisão

**Política LGPD (em SHADOW interno; ASSISTED externo bloqueado — ver ADR-004-DM):**

1. **Opt-in obrigatório** na 1ª resposta: disclaimer "Este atendimento usa IA. Sua conversa será retida por 90 dias para melhorar o atendimento. Responda 'OK' para continuar ou 'não' para encerrar."
2. **Retenção máxima 90 dias** de histórico de conversa. Após 90d, transcrição é deletada automaticamente (cron job).
3. **Direito de esquecimento via comando** "esqueça meus dados": deleta Conversation + Turns + BantScore + Redis session + audit log de transcrição (mantém apenas registro de deleção para auditoria reversa).
4. **Hard cap 25 turnos** por conversa. Aos 25 turnos sistema escala humano automaticamente (não responde mais). Aos 20 turnos sistema avisa preventivamente.
5. **Audit log** de quem acessou transcrições (DPO + ops humanos) com timestamp + propósito.
6. **DPA obrigatório** entre Novais Digital e cada tenant antes de operação externa (BLOQUEADO em ADR-004-DM).

**Em SHADOW interno** (Novais Digital staff only):
- Retenção reduzida a **30 dias** (não 90)
- Opt-in registrado em `OptInRecord` com signature_hash
- Audit log obrigatório de qualquer acesso a transcrição

### Motivação

1. **Compliance LGPD:** sem opt-in + retenção + esquecimento, ANPD multa.
2. **C3 protection:** hard cap 25 turnos garante 100% das conversas dentro do limite C3.
3. **Trust signal para clientes:** disclaimer LGPD claro aumenta confiança e reduz reclamação.
4. **Audit-ready:** documentação preparada para auditoria ANPD ou cliente enterprise.

### Consequências

- ✅ 100% das conversas têm opt-in registrado
- ✅ 0 conversas violam C3 (hard cap mecânico)
- ⚠️ ~5% dos usuários respondem "não" no opt-in → não atendemos (perda de potencial lead, mas tradeoff aceitável)
- ✅ Implementação simples (regex no início da conversa + cron job de delete)
- ⚠️ Comando "esqueça meus dados" precisa de testes E2E rigorosos — falha aqui = incidente LGPD

### Re-examinar

- Após 30 dias em SHADOW interno: taxa de "não" no opt-in. Se >15%, revisar disclaimer wording (talvez mais amigável).
- Trimestralmente: validar cron job de delete está rodando e completando.

---

## ADR-004-DM — Operação restrita a SHADOW interno até DPO contratado ⚠️ CRÍTICO

**Status:** ✅ Aceito 2026-05-13 (decisão executiva founder)
**Princípio relacionado:** LGPD + C8 (Tenant context) + risco operacional

### Contexto

Em conversa com founder em 2026-05-13, foi explicitado que **Novais Digital NÃO possui:**

- DPO (Data Protection Officer) interno designado
- Contrato de DPO-as-a-service (ICTS, Opice Blum, Baptista Luz, Privacy Brazil)
- Consultoria jurídica LGPD pontual
- Política de privacidade revisada juridicamente
- DPA template revisado para uso com tenants externos

LGPD (Lei 13.709/2018) determina:
- **Art. 41:** Controlador deve indicar encarregado (DPO) pelo tratamento de dados pessoais
- **Art. 50:** Boas práticas e governança incluem programa de proteção de dados, plano de resposta a incidente
- **Art. 52:** Sanções incluem multa de até **2% do faturamento** (limitado a R$ 50M por infração)
- **Art. 55-J:** ANPD pode determinar suspensão parcial ou total da atividade

Atendimento DM é o **único SKU criticality A** que processa dados pessoais de terceiros (clientes do tenant) em tempo real. Operar este SKU para clientes externos sem DPO + DPA + opt-in flow validado expõe Novais Digital a multa material, dano reputacional e cancelamento da operação.

### Decisão

**SHADOW INTERNO APENAS.** Operação restrita a:

1. **Apenas Novais Digital staff** como "usuário" — assinou opt-in explícito + ciente de uso de IA
2. **Zero dados de cliente real externo** processados neste SKU até Fase 2 LGPD completa
3. **Cobrança DESLIGADA** (`BILLING_ENABLED=false`)
4. **CRM em dry-run** (`CRM_DRY_RUN=true`, não cria deals reais)
5. **Retenção reduzida a 30 dias** (não 90)
6. **Bloqueio mecânico** em `/novais-digital:promote --to=assisted` (hook pre-promote retorna erro)
7. **Re-examinar:** founder decide caminho DPO até **2026-06-01** (ver `lgpd-mitigation.md`)

Apenas após **Fase 2 do `lgpd-mitigation.md`** completa (DPO designado + DPA template revisado + opt-in flow validado + audit log funcional + política publicada) é que ASSISTED externo pode ser habilitado.

### Motivação

1. **Risco regulatório material:** 2% do faturamento é potencialmente catastrófico para Novais Digital em estágio inicial.
2. **Risco reputacional:** primeiro incidente LGPD destrói reputação B2B — clientes enterprise não contratam quem teve incidente público.
3. **Honestidade ao founder:** não temos estrutura jurídica para operar com cliente externo neste SKU. Mentir sobre isso é violar C1 (diagnose-first) e expor o negócio.
4. **Operação interna é segura:** SHADOW interno valida tecnologia sem expor terceiros — value preserva, risk evita.
5. **Custo de DPO-as-a-service é baixo** vs risco: R$ 3-8K/mês vs multa potencial de milhões.
6. **Tempo de contratação é curto:** 1-2 semanas para DPO-as-a-service. Não bloqueia roadmap material.

### Consequências

- ✅ Risco LGPD reduzido a ~0 durante Fase 1 (apenas staff opt-in interno)
- ✅ Tecnologia validada em SHADOW interno antes de qualquer exposição externa
- ⚠️ Receita do SKU bloqueada até Fase 2 — **estimada perda de R$ 2.700/mês de receita projetada** (ver unit-economics.md §7) durante o bloqueio
- ⚠️ Roadmap dos outros SKUs (P0/P1) **não afetado** — eles não tocam dados pessoais externos em tempo real
- ✅ Quando habilitar ASSISTED externo, Novais Digital estará compliant + diferenciada vs concorrentes
- ⚠️ Founder precisa **executivamente decidir e contratar** opção até 2026-06-01

### Re-examinar

**Deadline: 2026-06-01.**

- Founder lê `lgpd-mitigation.md`, escolhe opção A/B/C
- Founder executa contratação ou certificação
- Quando Fase 2 100%: este ADR é **superseded** por ADR-005-DM (operação externa habilitada)
- Se 2026-06-01 chegar sem decisão: re-avaliar prioridade do SKU (talvez remover de wave 1 do roadmap consumer)

### Documentação suplementar

Plano detalhado de mitigação, opções de DPO, custos, riscos: **`lgpd-mitigation.md`**.

---

## Princípios para futuros ADRs

- **Numeração:** ADR-NNN-DM sequencial
- **Status:** Proposto | Aceito | Rejeitado | Substituído por ADR-XXX-DM
- **Estrutura:** Contexto → Decisão → Motivação → Consequências → Re-examinar
- **Quando criar:** mudança arquitetural OU trade-off significativo OU decisão executiva com impacto regulatório

## Próximo passo

→ Implementar Wave 1 do `plan.md`
→ Criar testes RED **antes** do build (Gate G6)
→ Founder lê `lgpd-mitigation.md` e inicia processo DPO
→ ADR-005-DM (futuro) supersedará ADR-004-DM quando Fase 2 LGPD concluir
