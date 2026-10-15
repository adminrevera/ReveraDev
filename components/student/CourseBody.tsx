import { sanitizeCourseHtml } from "@/lib/course-sanitize";

export default function CourseBody({ html }: { html: string }) {
  return <div className="course-content" dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(html) }} />;
}
