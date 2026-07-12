/**
 * Creator Certification Program Service
 * Structured courses and skill validation for content creators
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type CertificationLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type CourseStatus = "draft" | "published" | "archived";
export type EnrollmentStatus = "enrolled" | "in-progress" | "completed" | "failed" | "paused";
export type LessonType = "video" | "text" | "quiz" | "assignment" | "project";

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: LessonType;
  content: string; // URL or embedded content
  duration: number; // in minutes
  resources?: string[]; // URLs to downloadable resources
  order: number;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number; // percentage
  attempts: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "short-answer";
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
}

export interface Assignment {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  dueDate?: number;
  rubric?: Record<string, number>; // criteria -> points
  totalPoints: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: CertificationLevel;
  instructor: {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
  };
  lessons: Lesson[];
  quizzes: Quiz[];
  assignments: Assignment[];
  prerequisites?: string[]; // course IDs
  duration: number; // total hours
  status: CourseStatus;
  rating: number;
  reviews: number;
  enrolledCount: number;
  completedCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Enrollment {
  id: string;
  courseId: string;
  creatorId: string;
  status: EnrollmentStatus;
  enrolledAt: number;
  completedAt?: number;
  progress: number; // percentage
  lessonsCompleted: string[]; // lesson IDs
  quizScores: Record<string, number>; // quizId -> score
  assignmentScores: Record<string, number>; // assignmentId -> score
  certificateId?: string;
}

export interface Certificate {
  id: string;
  courseId: string;
  creatorId: string;
  creatorName: string;
  courseName: string;
  level: CertificationLevel;
  issuedAt: number;
  expiresAt?: number;
  verificationCode: string;
  skills: string[];
}

export interface SkillBadge {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  courses: string[]; // course IDs that award this badge
  creatorBadges: Map<string, number>; // creatorId -> count
}

// ============================================================================
// CREATOR CERTIFICATION SERVICE
// ============================================================================

class CreatorCertificationProgram {
  private courses: Map<string, Course> = new Map();
  private enrollments: Map<string, Enrollment> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private skillBadges: Map<string, SkillBadge> = new Map();
  private creatorCertificates: Map<string, Certificate[]> = new Map();

  constructor() {
    this.initializeDefaultCourses();
  }

  /**
   * Initialize default courses
   */
  private initializeDefaultCourses(): void {
    // Video Production Course
    this.createCourse({
      title: "Professional Video Production",
      description: "Master the fundamentals of video production from concept to delivery",
      category: "Video",
      level: "beginner",
      instructor: {
        id: "instr_1",
        name: "Professional Instructor",
        bio: "Experienced video producer",
      },
      lessons: [
        {
          id: "lesson_1",
          title: "Introduction to Video Production",
          type: "video",
          content: "https://example.com/lesson1",
          duration: 30,
          order: 1,
        },
        {
          id: "lesson_2",
          title: "Camera Techniques",
          type: "video",
          content: "https://example.com/lesson2",
          duration: 45,
          order: 2,
        },
        {
          id: "lesson_3",
          title: "Editing Fundamentals",
          type: "video",
          content: "https://example.com/lesson3",
          duration: 60,
          order: 3,
        },
      ],
      quizzes: [],
      assignments: [],
      duration: 10,
      status: "published",
      rating: 4.8,
      reviews: 250,
      enrolledCount: 1500,
      completedCount: 1200,
    });

    // Audio Production Course
    this.createCourse({
      title: "Podcast & Audio Production",
      description: "Learn to create professional podcasts and audio content",
      category: "Audio",
      level: "beginner",
      instructor: {
        id: "instr_2",
        name: "Audio Expert",
        bio: "Professional audio engineer",
      },
      lessons: [
        {
          id: "lesson_4",
          title: "Audio Equipment Basics",
          type: "video",
          content: "https://example.com/lesson4",
          duration: 30,
          order: 1,
        },
        {
          id: "lesson_5",
          title: "Recording Techniques",
          type: "video",
          content: "https://example.com/lesson5",
          duration: 45,
          order: 2,
        },
      ],
      quizzes: [],
      assignments: [],
      duration: 8,
      status: "published",
      rating: 4.7,
      reviews: 180,
      enrolledCount: 900,
      completedCount: 720,
    });

    // Content Strategy Course
    this.createCourse({
      title: "Content Strategy & Growth",
      description: "Develop effective content strategies to grow your audience",
      category: "Strategy",
      level: "intermediate",
      instructor: {
        id: "instr_3",
        name: "Growth Strategist",
        bio: "Content marketing expert",
      },
      lessons: [
        {
          id: "lesson_6",
          title: "Audience Analysis",
          type: "text",
          content: "https://example.com/lesson6",
          duration: 20,
          order: 1,
        },
        {
          id: "lesson_7",
          title: "Content Planning",
          type: "video",
          content: "https://example.com/lesson7",
          duration: 40,
          order: 2,
        },
      ],
      quizzes: [],
      assignments: [],
      duration: 12,
      status: "published",
      rating: 4.9,
      reviews: 320,
      enrolledCount: 2000,
      completedCount: 1600,
    });
  }

  /**
   * Create course
   */
  createCourse(courseData: Omit<Course, "id" | "createdAt" | "updatedAt">): Course {
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const course: Course = {
      id: courseId,
      ...courseData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.courses.set(courseId, course);
    return course;
  }

  /**
   * Get course
   */
  getCourse(courseId: string): Course | undefined {
    return this.courses.get(courseId);
  }

  /**
   * Get courses by level
   */
  getCoursesByLevel(level: CertificationLevel): Course[] {
    return Array.from(this.courses.values())
      .filter((c) => c.level === level && c.status === "published")
      .sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get courses by category
   */
  getCoursesByCategory(category: string): Course[] {
    return Array.from(this.courses.values())
      .filter((c) => c.category === category && c.status === "published")
      .sort((a, b) => b.enrolledCount - a.enrolledCount);
  }

  /**
   * Search courses
   */
  searchCourses(searchTerm: string): Course[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.courses.values())
      .filter(
        (c) =>
          c.status === "published" &&
          (c.title.toLowerCase().includes(term) || c.description.toLowerCase().includes(term) || c.category.toLowerCase().includes(term))
      )
      .sort((a, b) => b.rating - a.rating);
  }

  /**
   * Enroll creator in course
   */
  enrollCreator(courseId: string, creatorId: string): Enrollment | undefined {
    const course = this.courses.get(courseId);
    if (!course) return undefined;

    const enrollmentId = `enroll_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const enrollment: Enrollment = {
      id: enrollmentId,
      courseId,
      creatorId,
      status: "enrolled",
      enrolledAt: Date.now(),
      progress: 0,
      lessonsCompleted: [],
      quizScores: {},
      assignmentScores: {},
    };

    this.enrollments.set(enrollmentId, enrollment);
    course.enrolledCount++;

    return enrollment;
  }

  /**
   * Get enrollment
   */
  getEnrollment(enrollmentId: string): Enrollment | undefined {
    return this.enrollments.get(enrollmentId);
  }

  /**
   * Get creator enrollments
   */
  getCreatorEnrollments(creatorId: string, status?: EnrollmentStatus): Enrollment[] {
    return Array.from(this.enrollments.values())
      .filter((e) => e.creatorId === creatorId && (!status || e.status === status))
      .sort((a, b) => b.enrolledAt - a.enrolledAt);
  }

  /**
   * Complete lesson
   */
  completeLessonInCourse(enrollmentId: string, lessonId: string): Enrollment | undefined {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return undefined;

    if (!enrollment.lessonsCompleted.includes(lessonId)) {
      enrollment.lessonsCompleted.push(lessonId);

      const course = this.courses.get(enrollment.courseId);
      if (course) {
        enrollment.progress = Math.round((enrollment.lessonsCompleted.length / course.lessons.length) * 100);

        if (enrollment.progress === 100) {
          enrollment.status = "completed";
          enrollment.completedAt = Date.now();
          course.completedCount++;
          this.issueCertificate(enrollment);
        } else if (enrollment.status === "enrolled") {
          enrollment.status = "in-progress";
        }
      }
    }

    return enrollment;
  }

  /**
   * Submit quiz
   */
  submitQuiz(enrollmentId: string, quizId: string, score: number): Enrollment | undefined {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) return undefined;

    enrollment.quizScores[quizId] = score;
    return enrollment;
  }

  /**
   * Issue certificate
   */
  private issueCertificate(enrollment: Enrollment): Certificate | undefined {
    const course = this.courses.get(enrollment.courseId);
    if (!course) return undefined;

    const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const verificationCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    const certificate: Certificate = {
      id: certificateId,
      courseId: enrollment.courseId,
      creatorId: enrollment.creatorId,
      creatorName: "Creator",
      courseName: course.title,
      level: course.level,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      verificationCode,
      skills: this.extractSkillsFromCourse(course),
    };

    this.certificates.set(certificateId, certificate);
    enrollment.certificateId = certificateId;

    // Track creator certificates
    if (!this.creatorCertificates.has(enrollment.creatorId)) {
      this.creatorCertificates.set(enrollment.creatorId, []);
    }
    this.creatorCertificates.get(enrollment.creatorId)!.push(certificate);

    return certificate;
  }

  /**
   * Extract skills from course
   */
  private extractSkillsFromCourse(course: Course): string[] {
    // Extract skills from course title and description
    const skillKeywords = ["video", "audio", "editing", "production", "strategy", "content", "marketing", "growth"];
    const skills: string[] = [];

    skillKeywords.forEach((keyword) => {
      if (course.title.toLowerCase().includes(keyword) || course.description.toLowerCase().includes(keyword)) {
        skills.push(keyword);
      }
    });

    return skills.length > 0 ? skills : ["content-creation"];
  }

  /**
   * Get certificate
   */
  getCertificate(certificateId: string): Certificate | undefined {
    return this.certificates.get(certificateId);
  }

  /**
   * Get creator certificates
   */
  getCreatorCertificates(creatorId: string): Certificate[] {
    return this.creatorCertificates.get(creatorId) || [];
  }

  /**
   * Verify certificate
   */
  verifyCertificate(certificateId: string, verificationCode: string): boolean {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) return false;

    return certificate.verificationCode === verificationCode;
  }

  /**
   * Create skill badge
   */
  createSkillBadge(name: string, description: string, category: string, courses: string[], icon?: string): SkillBadge {
    const badgeId = `badge_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const badge: SkillBadge = {
      id: badgeId,
      name,
      description,
      icon,
      category,
      courses,
      creatorBadges: new Map(),
    };

    this.skillBadges.set(badgeId, badge);
    return badge;
  }

  /**
   * Award badge to creator
   */
  awardBadgeToCreator(badgeId: string, creatorId: string): SkillBadge | undefined {
    const badge = this.skillBadges.get(badgeId);
    if (!badge) return undefined;

    const count = badge.creatorBadges.get(creatorId) || 0;
    badge.creatorBadges.set(creatorId, count + 1);

    return badge;
  }

  /**
   * Get creator badges
   */
  getCreatorBadges(creatorId: string): SkillBadge[] {
    return Array.from(this.skillBadges.values()).filter((b) => b.creatorBadges.has(creatorId));
  }

  /**
   * Get popular courses
   */
  getPopularCourses(limit: number = 10): Course[] {
    return Array.from(this.courses.values())
      .filter((c) => c.status === "published")
      .sort((a, b) => {
        const scoreA = a.enrolledCount * 0.6 + a.rating * 0.4;
        const scoreB = b.enrolledCount * 0.6 + b.rating * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get recommended courses
   */
  getRecommendedCourses(creatorId: string, limit: number = 5): Course[] {
    const enrolledCourses = this.getCreatorEnrollments(creatorId).map((e) => e.courseId);

    return Array.from(this.courses.values())
      .filter((c) => c.status === "published" && !enrolledCourses.includes(c.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Get learning progress
   */
  getCreatorLearningProgress(creatorId: string): {
    totalEnrolled: number;
    totalCompleted: number;
    totalCertificates: number;
    averageProgress: number;
    skillBadges: number;
  } {
    const enrollments = this.getCreatorEnrollments(creatorId);
    const certificates = this.getCreatorCertificates(creatorId);
    const badges = this.getCreatorBadges(creatorId);

    const totalCompleted = enrollments.filter((e) => e.status === "completed").length;
    const averageProgress = enrollments.length > 0 ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length : 0;

    return {
      totalEnrolled: enrollments.length,
      totalCompleted,
      totalCertificates: certificates.length,
      averageProgress,
      skillBadges: badges.length,
    };
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.courses.clear();
    this.enrollments.clear();
    this.certificates.clear();
    this.skillBadges.clear();
    this.creatorCertificates.clear();
    this.initializeDefaultCourses();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let certificationInstance: CreatorCertificationProgram | null = null;

export function getCreatorCertification(): CreatorCertificationProgram {
  if (!certificationInstance) {
    certificationInstance = new CreatorCertificationProgram();
  }
  return certificationInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCreatorCertification(): void {
  if (certificationInstance) {
    certificationInstance.reset();
  }
  certificationInstance = null;
}

export default CreatorCertificationProgram;
