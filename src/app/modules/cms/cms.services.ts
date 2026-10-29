import { prisma } from "../../../lib/prisma.js";
import AppError from "../../errorHelpers/appError.js";
import { StatusCodes } from "http-status-codes";

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

// Blog Comments (Facebook-style threaded conversation)
const getBlogComments = async (blogIdentifier: string) => {
  const post = await prisma.blogPost.findFirst({
    where: {
      OR: [{ id: blogIdentifier }, { slug: blogIdentifier }],
    },
    select: { id: true },
  });

  if (!post) {
    return [];
  }

  return await prisma.blogComment.findMany({
    where: {
      blogPostId: post.id,
      parentId: null, // Top-level comments
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profilePhoto: true,
          role: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profilePhoto: true,
              role: true,
            },
          },
        },
      },
    },
  });
};

const createBlogComment = async (
  blogIdentifier: string,
  userId: string,
  userRole: string,
  content: string,
  parentId?: string | null,
) => {
  const post = await prisma.blogPost.findFirst({
    where: {
      OR: [{ id: blogIdentifier }, { slug: blogIdentifier }],
    },
  });

  if (!post) {
    throw new AppError(StatusCodes.NOT_FOUND, "Blog post not found");
  }

  if (!content || !content.trim()) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Comment content cannot be empty");
  }

  let effectiveParentId: string | null = null;

  if (parentId) {
    const parentComment = await prisma.blogComment.findUnique({
      where: { id: parentId },
      include: { parent: true },
    });

    if (!parentComment) {
      throw new AppError(StatusCodes.NOT_FOUND, "Parent comment not found");
    }

    // Identify root comment
    const rootComment = parentComment.parentId
      ? parentComment.parent ||
        (await prisma.blogComment.findUnique({ where: { id: parentComment.parentId } }))
      : parentComment;

    const rootCommentUserId = rootComment?.userId;

    // Rule: Only ADMIN (Doctor) OR the user who posted the comment can reply!
    const isAdmin = userRole === "ADMIN";
    const isOriginalAuthor = rootCommentUserId === userId;

    if (!isAdmin && !isOriginalAuthor) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "Only the doctor and the original commenter can reply in this consultation thread.",
      );
    }

    // Keep replies grouped cleanly under the parent thread
    effectiveParentId = rootComment ? rootComment.id : parentComment.id;
  }

  return await prisma.blogComment.create({
    data: {
      content: content.trim(),
      blogPostId: post.id,
      userId,
      parentId: effectiveParentId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profilePhoto: true,
          role: true,
        },
      },
    },
  });
};

const deleteBlogComment = async (
  commentId: string,
  userId: string,
  userRole: string,
) => {
  const comment = await prisma.blogComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new AppError(StatusCodes.NOT_FOUND, "Comment not found");
  }

  if (userRole !== "ADMIN" && comment.userId !== userId) {
    throw new AppError(StatusCodes.FORBIDDEN, "Not authorized to delete this comment");
  }

  return await prisma.blogComment.delete({
    where: { id: commentId },
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
  getBlogComments,
  createBlogComment,
  deleteBlogComment,
};
