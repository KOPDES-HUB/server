-- CreateTable
CREATE TABLE "informasi_aplikasi" (
    "id" TEXT NOT NULL,
    "id_instansi" INTEGER,
    "nama_instansi" VARCHAR(255),
    "nama_proyek" VARCHAR(255),
    "tahun_proyek" INTEGER,
    "pic_client" VARCHAR(255),
    "pic_no" VARCHAR(15),
    "informasi_teknis_dev" TEXT,
    "informasi_teknis_prod" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(200),
    "updated_at" TIMESTAMP(3),
    "updated_by" VARCHAR(200),

    CONSTRAINT "informasi_aplikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informasi_aplikasi_files" (
    "id" TEXT NOT NULL,
    "id_informasi_aplikasi" TEXT,
    "nama_file" VARCHAR(255),
    "path_file" VARCHAR(255),
    "extension" VARCHAR(10),
    "client_name" VARCHAR(255),
    "file_size" DOUBLE PRECISION,

    CONSTRAINT "informasi_aplikasi_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informasi_aplikasi_team" (
    "id" TEXT NOT NULL,
    "id_informasi_aplikasi" TEXT,
    "user_id" TEXT,
    "id_user_group" INTEGER,
    "nama_team" VARCHAR(255),
    "nama_usr_group" VARCHAR(255),

    CONSTRAINT "informasi_aplikasi_team_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "informasi_aplikasi_files" ADD CONSTRAINT "informasi_aplikasi_files_id_informasi_aplikasi_fkey" FOREIGN KEY ("id_informasi_aplikasi") REFERENCES "informasi_aplikasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informasi_aplikasi_team" ADD CONSTRAINT "informasi_aplikasi_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informasi_aplikasi_team" ADD CONSTRAINT "informasi_aplikasi_team_id_informasi_aplikasi_fkey" FOREIGN KEY ("id_informasi_aplikasi") REFERENCES "informasi_aplikasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
