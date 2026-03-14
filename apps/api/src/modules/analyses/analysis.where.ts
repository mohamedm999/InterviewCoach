import { Prisma } from '@prisma/client';

export function activeAnalysisWhere(
  where: Prisma.AnalysisWhereInput = {},
): Prisma.AnalysisWhereInput {
  return {
    deletedAt: null,
    ...where,
  };
}
