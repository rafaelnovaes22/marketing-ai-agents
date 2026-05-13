// Domain entity: Caption por rede social
// Adapta o texto aos limites e estilo de cada rede

import { RedeSocial } from './RedeSocial.js';

export interface CaptionPorRede {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string[]; // Thread mode (ADR-003-DS)
}

export class Caption {
  readonly porRede: CaptionPorRede;

  private constructor(porRede: CaptionPorRede) {
    this.porRede = porRede;
  }

  static create(porRede: CaptionPorRede): Caption {
    if (!porRede || Object.keys(porRede).length === 0) {
      throw new Error('Caption deve ter ao menos 1 rede preenchida');
    }
    return new Caption(porRede);
  }

  paraRede(rede: RedeSocial): string | string[] | undefined {
    return this.porRede[rede.value];
  }

  /**
   * Valida que cada caption respeita limite de caracteres da rede.
   * Twitter: cada tweet do thread ≤ 280.
   * Outras: caption única dentro do limite.
   */
  validar(): { ok: boolean; erros: string[] } {
    const erros: string[] = [];

    for (const redeName of Object.keys(this.porRede)) {
      const rede = RedeSocial.create(redeName);
      const limite = rede.limiteCaracteres();
      const conteudo = this.porRede[redeName as keyof CaptionPorRede];

      if (rede.usaModoThread()) {
        const tweets = conteudo as string[] | undefined;
        if (!tweets || tweets.length < 2) {
          erros.push('Twitter exige thread com ≥ 2 tweets');
          continue;
        }
        tweets.forEach((t, i) => {
          if (t.length > limite) {
            erros.push(`Tweet ${i + 1} excede ${limite} chars (${t.length})`);
          }
        });
      } else {
        const texto = conteudo as string | undefined;
        if (!texto || texto.trim().length === 0) {
          erros.push(`${redeName} caption vazia`);
          continue;
        }
        if (texto.length > limite) {
          erros.push(`${redeName} caption excede ${limite} chars (${texto.length})`);
        }
      }
    }

    return { ok: erros.length === 0, erros };
  }

  /**
   * Conta total de redes preenchidas.
   */
  totalRedes(): number {
    return Object.keys(this.porRede).length;
  }
}
