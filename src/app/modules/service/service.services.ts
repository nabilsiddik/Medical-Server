import { prisma } from "../../../lib/prisma.js";

const getAllServices = async (includeInactive = false) => {
  return await prisma.service.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
};

const getServiceBySlug = async (slug: string) => {
  return await prisma.service.findUnique({
    where: { slug },
  });
};

const createService = async (data: any) => {
  return await prisma.service.create({
    data,
  });
};

const updateService = async (id: string, data: any) => {
  return await prisma.service.update({
    where: { id },
    data,
  });
};

const deleteService = async (id: string) => {
  return await prisma.service.delete({
    where: { id },
  });
};

export const ServiceServices = {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
};
