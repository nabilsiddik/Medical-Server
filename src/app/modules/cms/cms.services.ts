import { prisma } from "../../../lib/prisma.js";

// Blogs
const getPublicBlogs = async () => {
  return await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });
};

const getAllBlogsAdmin = async () => {
  return await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });
};

const getBlogBySlug = async (slug: string) => {
  return await prisma.blogPost.findUnique({
    where: { slug },
  });
};

const createBlogPost = async (data: any) => {
  return await prisma.blogPost.create({ data });
};

const updateBlogPost = async (id: string, data: any) => {
  return await prisma.blogPost.update({
    where: { id },
    data,
  });
};

const deleteBlogPost = async (id: string) => {
  return await prisma.blogPost.delete({
    where: { id },
  });
};

// FAQs
const getPublicFaqs = async () => {
  return await prisma.fAQ.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
};

const createFaq = async (data: any) => {
  return await prisma.fAQ.create({ data });
};

// Testimonials
const getPublicTestimonials = async () => {
  return await prisma.testimonial.findMany({
    where: { isApproved: true },
    orderBy: { displayOrder: "asc" },
  });
};

const createTestimonial = async (data: any) => {
  return await prisma.testimonial.create({ data });
};

// Gallery
const getPublicGallery = async () => {
  return await prisma.galleryItem.findMany({
    where: { isConsentGiven: true },
    orderBy: { displayOrder: "asc" },
  });
};

const createGalleryItem = async (data: any) => {
  return await prisma.galleryItem.create({ data });
};

// Inquiries
const submitInquiry = async (data: any) => {
  return await prisma.inquiry.create({ data });
};

const getInquiries = async () => {
  return await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const CmsServices = {
  getPublicBlogs,
  getAllBlogsAdmin,
  getBlogBySlug,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getPublicFaqs,
  createFaq,
  getPublicTestimonials,
  createTestimonial,
  getPublicGallery,
  createGalleryItem,
  submitInquiry,
  getInquiries,
};
