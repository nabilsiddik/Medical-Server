-- AlterTable
ALTER TABLE "users" ADD COLUMN     "forgotPassOTP" INTEGER,
ADD COLUMN     "forgotPassOTPExpiration" TIMESTAMP(3),
ALTER COLUMN "emailOTP" DROP NOT NULL,
ALTER COLUMN "emailOTPExpiration" DROP NOT NULL;
