import { Router } from "express";
import { CmsControllers } from "./cms.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { fileUploader } from "../../utils/fileUploader.js";

const cmsRouter = Router();

// Image / Media Upload to Cloudinary
cmsRouter.post(
  "/upload",
  checkAuth(UserRole.ADMIN),
  fileUploader.upload.single("file"),
  CmsControllers.uploadMediaFile,
);

// Public website content
cmsRouter.get("/blogs/admin/all", checkAuth(UserRole.ADMIN), CmsControllers.getAllBlogsAdmin);
cmsRouter.get("/blogs", CmsControllers.getPublicBlogs);
cmsRouter.get("/blogs/:slug", CmsControllers.getBlogBySlug);
cmsRouter.get("/faqs", CmsControllers.getPublicFaqs);
cmsRouter.get("/testimonials", CmsControllers.getPublicTestimonials);
cmsRouter.get("/gallery", CmsControllers.getPublicGallery);
cmsRouter.post("/inquiries", CmsControllers.submitInquiry);

// Doctor Admin content management
cmsRouter.post(
  "/blogs",
  checkAuth(UserRole.ADMIN),
  CmsControllers.createBlogPost,
);
cmsRouter.patch(
  "/blogs/:id",
  checkAuth(UserRole.ADMIN),
  CmsControllers.updateBlogPost,
);
cmsRouter.delete(
  "/blogs/:id",
  checkAuth(UserRole.ADMIN),
  CmsControllers.deleteBlogPost,
);

cmsRouter.post(
  "/faqs",
  checkAuth(UserRole.ADMIN),
  CmsControllers.createFaq,
);

cmsRouter.post(
  "/testimonials",
  checkAuth(UserRole.ADMIN),
  CmsControllers.createTestimonial,
);

cmsRouter.get(
  "/inquiries",
  checkAuth(UserRole.ADMIN),
  CmsControllers.getInquiries,
);

// Blog Comments (Facebook-style threaded discussion)
// 1. Public list of comments for a blog post
cmsRouter.get("/blogs/:blogId/comments", CmsControllers.getBlogComments);

// 2. Only logged-in users can post comments or threaded replies
cmsRouter.post("/blogs/:blogId/comments", checkAuth(), CmsControllers.createBlogComment);

// 3. Delete comment (Doctor admin or comment author)
cmsRouter.delete("/comments/:commentId", checkAuth(), CmsControllers.deleteBlogComment);

export default cmsRouter;
