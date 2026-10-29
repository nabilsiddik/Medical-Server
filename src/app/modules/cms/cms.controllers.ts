import type { Request, Response } from "express";
import { catchAsync } from "../../errorHelpers/catchAsync.js";
import { CmsServices } from "./cms.services.js";
import { sendResponse } from "../../utils/userResponse.js";
import { StatusCodes } from "http-status-codes";

// Blogs
const getPublicBlogs = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getPublicBlogs();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Blog posts retrieved successfully",
    data: result,
  });
});

const getAllBlogsAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getAllBlogsAdmin();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All blogs retrieved successfully",
    data: result,
  });
});

const getBlogBySlug = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.getBlogBySlug(req.params.slug as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Blog post retrieved successfully",
    data: result,
  });
});

const createBlogPost = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.createBlogPost(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Blog post published",
    data: result,
  });
});

const updateBlogPost = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.updateBlogPost(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Blog post updated successfully",
    data: result,
  });
});

const deleteBlogPost = catchAsync(async (req: Request, res: Response) => {
  await CmsServices.deleteBlogPost(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Blog post deleted successfully",
    data: null,
  });
});

// FAQs
const getPublicFaqs = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getPublicFaqs();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "FAQs retrieved successfully",
    data: result,
  });
});

const createFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.createFaq(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "FAQ added successfully",
    data: result,
  });
});

// Testimonials
const getPublicTestimonials = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getPublicTestimonials();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Testimonials retrieved successfully",
    data: result,
  });
});

const createTestimonial = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.createTestimonial(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Testimonial submitted successfully",
    data: result,
  });
});

// Gallery
const getPublicGallery = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getPublicGallery();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Gallery items retrieved successfully",
    data: result,
  });
});

// Inquiries
const submitInquiry = catchAsync(async (req: Request, res: Response) => {
  const result = await CmsServices.submitInquiry(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Inquiry submitted. Our clinic will contact you shortly.",
    data: result,
  });
});

const getInquiries = catchAsync(async (_req: Request, res: Response) => {
  const result = await CmsServices.getInquiries();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Inquiries retrieved successfully",
    data: result,
  });
});

export const CmsControllers = {
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
  submitInquiry,
  getInquiries,
};
