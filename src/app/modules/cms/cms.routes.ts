import { Router } from "express";
import { CmsControllers } from "./cms.controllers.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const cmsRouter = Router();

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

export default cmsRouter;
