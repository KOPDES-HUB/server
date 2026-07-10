/*
  Warnings:

  - You are about to drop the `transaksi_penjualan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaksi_penjualan" DROP CONSTRAINT "fk_transaksi_penjualan_koperasi_ref";

-- DropTable
DROP TABLE "transaksi_penjualan";

-- CreateTable
CREATE TABLE "kopdes_hub_sch_transaksi_penjualan" (
    "transaksi_sample_id" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "nama_pelanggan" TEXT,
    "tanggal_dibuat" TIMESTAMP(6),
    "total_pembayaran" DECIMAL(18,2),
    "status_transaksi" TEXT,
    "metode_pembayaran" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_transaksi_penjualan_pk" PRIMARY KEY ("transaksi_sample_id")
);

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_transaksi_penjualan" ADD CONSTRAINT "fk_transaksi_penjualan_koperasi_ref" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;
