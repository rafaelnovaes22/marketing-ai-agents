---
sku_id: atendimento-dm-agent
lifecycle_type: agentic_with_lgpd_gate
current_stage: draft
internal_only: true
external_blocked: true
created_at: 2026-05-13
last_transition: 2026-05-13
criticality: A
promotion_block_active: true
promotion_block_reason: "Sem DPO interno + sem consultoria LGPD contratada. Bloqueio até ADR-004-DM resolvido."
re_examine_deadline: 2026-06-01
---

# Lifecycle Stage — Atendimento DM Agent

> ⚠️ **BLOQUEIO EXPLÍCITO ATIVO:**
>
> **SHADOW interno OK; ASSISTED/AUTONOMOUS bloqueado até DPO designado + DPA LGPD assinado.**
>
> Esta é uma decisão executiva consciente baseada em ausência de DPO interno e ausência de consultoria jurídica LGPD contratada. Promover este SKU para tenants externos sem essas estruturas expõe Novais Digital a multa de até 2% do faturamento (Art. 52 LGPD) e cancelamento por ANPD. Ver `lgpd-mitigation.md` para plano completo.

## Estado atual

**`draft_internal_only`** — spec aprovada por @unit-economist (margem 93%), plan aprovado por @artifact-architect com bloqueio LGPD ativo. Atendimento a clientes EXTERNOS bloqueado mecanicamente.

## Histórico de transições

| Stage | Data | Aprovador | Notas |
|-------|------|-----------|-------|
| `(new)` → `draft` | 2026-05-13 | @po-guardian (pending review) | Spec criada com criticality A |
| `draft` → `draft_internal_only` | 2026-05-13 | founder (override LGPD via ADR-004-DM) | Sem DPO disponível. Decisão executiva: SHADOW interno-only enquanto resolve LGPD. |

## Roadmap por fase

### Fase 1 — SHADOW INTERNO (autorizado agora) ✅

**Status:** habilitado após cumprimento dos gates.

**Critério de pronto (6 gates):**

1. [ ] `@po-guardian` revisar spec.md
2. [x] `@unit-economist` aprovou unit-economics.md (margem 93%) — 2026-05-13
3. [x] `@artifact-architect` aprovou plan.md (com bloqueio LGPD) — 2026-05-13
4. [ ] Eval-suite com ≥ 25 cenários de conversa (adversarial-heavy, criticality A exige) — eval-cases.md criado
5. [ ] Adversarial harness: 100% pass (0 jailbreaks bem-sucedidos)
6. [ ] Opt-in form criado e assinado por 100% staff Novais Digital participante
7. [ ] Disclaimer LGPD ativo em 100% das conversas

**Restrições adicionais (ADR-004-DM):**
- ✅ Dados processados: APENAS DMs internos Novais Digital (staff opt-in)
- ✅ Zero dados de terceiros não-consentidos
- ✅ Retenção transcrições: 30 dias (não 90)
- ✅ Sem cobrança (`BILLING_ENABLED=false`, R$ 0 por DM)
- ✅ CRM em dry-run (`CRM_DRY_RUN=true`, não cria deal real)
- ✅ Audit log completo (quem opt-in, quem acessou transcrição, quando)

**Comando para entrar em SHADOW interno:** `/novais-digital:promote atendimento-dm-agent --to=shadow_internal`

### Fase 2 — RESOLUÇÃO LGPD (bloqueia ASSISTED externo) ⛔

**Status:** **BLOQUEADO**. Não pode avançar até founder executar UMA das opções em `lgpd-mitigation.md`.

**ADR-004-DM pendência crítica:** founder precisa escolher e executar UMA das opções:

- [ ] **Opção A:** Consultoria LGPD pontual (R$ 3-5K one-shot, ~2-3 semanas)
- [ ] **Opção B:** DPO-as-a-service contínuo (R$ 3-8K/mês — ICTS, Opice Blum, Baptista Luz, Privacy Brazil)
- [ ] **Opção C:** Founder se certifica como DPO (curso ANPD, 40h, R$ 1-2K) — solução temporária

**Entregáveis Fase 2:**

- [ ] DPO designado (interno ou as-a-service) + contrato assinado
- [ ] DPA template revisado juridicamente (modelo para tenants externos)
- [ ] Política de privacidade publicada (Novais Digital + por tenant)
- [ ] Opt-in flow implementado e testado para clientes externos
- [ ] Direito de esquecimento implementado e testado (delete via API + comando "esqueça meus dados")
- [ ] ANPD report registrado se aplicável (>1.000 titulares)
- [ ] Audit log de acesso a transcrições com export para auditoria

**Deadline informal:** 2026-06-01 (founder decide caminho até essa data).

### Fase 3 — ASSISTED EXTERNO (após Fase 2 completa) ⛔

**Status:** **BLOQUEADO** mecanicamente. Hook pre-promote retorna erro até Fase 2 100%.

**Critério adicional (cumulativo com Fase 1):**

- [ ] Fase 2 LGPD 100% concluída
- [ ] DPA assinado com cada tenant externo
- [ ] Humano revisa CADA resposta antes do envio (window 30s para aprovar/editar)
- [ ] 30 dias mínimos em ASSISTED com aprovação > 95%, edição < 10%
- [ ] Volume mínimo: ≥30 DMs/dia comprovados em SHADOW interno
- [ ] @promotion-officer assina transição

**Cobrança ainda OFF em ASSISTED** (gratuito durante validação).

### Fase 4 — AUTONOMOUS (após 30 dias em ASSISTED sem incidente) ⛔

**Status:** **BLOQUEADO** mecanicamente.

**Critério (cumulativo):**

- [ ] 30 dias consecutivos em ASSISTED com aprovação humana > 95%
- [ ] 0 rejeições nos últimos 7 dias
- [ ] SLA achievement ≥ 95% sustentado
- [ ] DeepAgent mensal `@reviewer` audit pass (C1-C8)
- [ ] 0 incidentes LGPD em todo o período ASSISTED

**A partir de AUTONOMOUS:** cobra R$ 5 por `lead_qualificado_dm`.

**Compromisso de não-cobrança:** se houver escalonamento humano necessário, Novais Digital absorve custo (não cobra do cliente).

## Rollback automático (kill switch)

Em QUALQUER estágio, sistema dispara rollback automático para `draft_internal_only` se:

- 3+ incidentes graves em 7 dias (ADR-002-DM)
- Brand consistency cai abaixo de 90% em respostas
- Custo médio ultrapassa R$ 1,50 por conversa (vs estimado R$ 0,37)
- **ANY reclamação LGPD** de titular
- Detecção de PII vazado em resposta
- Adversarial harness rate cai abaixo de 95% em re-run

## Métricas de saúde

### Fase 1 (SHADOW interno)
- Eval-cases ≥ 25 escritos ✅
- Pass rate ≥ 85% em LLM-as-judge
- Adversarial pass rate = 100%
- Tempo médio resposta < 10s (p95)
- Confidence threshold 0.7+ em decisão de qualificar

### Fase 2 (gates LGPD) ⛔
- DPO designado e contratado
- Documentação jurídica aprovada
- Audit log funcional
- Opt-in form aceitação ≥ 100% staff

### Fase 3 (ASSISTED externo) ⛔
- 30+ DMs/dia comprovados
- Human approval rate ≥ 95%
- DPA assinado por tenant
- 0 incidentes LGPD

### Fase 4 (AUTONOMOUS) ⛔
- Customer satisfaction ≥ 4.5/5
- Receita > custo total
- Audit mensal DeepAgent pass
- 0 incidentes LGPD em 90 dias

## Bloqueio mecânico (hook pre-promote)

```typescript
// hooks/pre-promote-atendimento-dm.ts
if (sku === 'atendimento-dm-agent' && targetStage in ['assisted', 'autonomous']) {
  const lgpdStatus = readLgpdMitigationStatus();
  if (!lgpdStatus.phase2_complete) {
    throw new PromotionBlockedError(
      'ADR-004-DM bloqueia promoção para ASSISTED/AUTONOMOUS. ' +
      'Founder deve completar lgpd-mitigation.md Fase 2 ' +
      '(DPO designado + DPA template + opt-in flow) antes desta promoção.'
    );
  }
}
```

## Próximo passo

→ Aprovar `spec.md` por `@po-guardian` (pendente)
→ Implementar Wave 1 do `plan.md` (D6 do roadmap de 14 dias)
→ Iniciar SHADOW interno em D13-D14
→ **Em paralelo:** founder lê `lgpd-mitigation.md` e decide caminho DPO até **2026-06-01**

---

**Bloqueio crítico documentado:** AUTONOMOUS externo só após `lgpd-mitigation.md` Fase 2 completa. Sem exceção.
