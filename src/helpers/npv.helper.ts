export interface ArusKasTahunan {
  tahun: number;
  arus_kas: number;
}

export interface NpvDetailRow extends ArusKasTahunan {
  period: number;
  discounted: number;
}

export interface NpvResult {
  nilai: number;
  modal_awal: number;
  discount_rate: number;
  rumus: string;
  detail_per_tahun: NpvDetailRow[];
  total_arus_kas: number;
}

/**
 * Parse modal_awal dari profil_koperasi (string) ke angka.
 * Mendukung format: "50000000", "50.000.000", "Rp 50.000.000", dll.
 */
export function parseModalAwal(value: string | null | undefined): number {
  if (!value?.trim()) return 0;

  const normalized = value.trim();
  const hasCommaDecimal = /,\d{1,2}$/.test(normalized);

  let cleaned = normalized.replace(/[^\d.,]/g, "");
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(/[.,]/g, "");
  }

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * NPV = -modal_awal + Σ(arus_kas_t / (1 + r)^t)
 * t = urutan tahun relatif (tahun pertama = periode 1)
 */
export function calculateNPV(
  modalAwal: number,
  arusKasByYear: ArusKasTahunan[],
  discountRate = 0.1,
): NpvResult {
  const sorted = [...arusKasByYear].sort((a, b) => a.tahun - b.tahun);
  const baseYear = sorted[0]?.tahun;

  let npv = -modalAwal;
  const detail: NpvDetailRow[] = sorted.map((row) => {
    const period = baseYear ? row.tahun - baseYear + 1 : 1;
    const discounted = row.arus_kas / Math.pow(1 + discountRate, period);
    npv += discounted;
    return {
      tahun: row.tahun,
      arus_kas: row.arus_kas,
      period,
      discounted: Math.round(discounted * 100) / 100,
    };
  });

  const totalArusKas = sorted.reduce((sum, row) => sum + row.arus_kas, 0);

  return {
    nilai: Math.round(npv * 100) / 100,
    modal_awal: modalAwal,
    discount_rate: discountRate,
    rumus: "-modal_awal + Σ(arus_kas_t / (1 + r)^t)",
    detail_per_tahun: detail,
    total_arus_kas: totalArusKas,
  };
}
