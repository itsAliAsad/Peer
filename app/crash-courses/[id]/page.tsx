"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Users,
    Star,
    Shield,
    GraduationCap,
    Plus,
    X,
    Vote,
    Check,
    Play,
    CheckCircle,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import VotingSection from "@/components/crash-courses/VotingSection";
import EnrollmentBar from "@/components/crash-courses/EnrollmentBar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useRole } from "@/context/RoleContext";

const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: "bg-emerald-500/15 text-emerald-700" },
    requesting: { label: "Requesting", color: "bg-amber-500/15 text-amber-700" },
    voting: { label: "Voting", color: "bg-blue-500/15 text-blue-700" },
    confirming: { label: "Confirming", color: "bg-violet-500/15 text-violet-700" },
    pending_tutor_review: { label: "Tutor Review", color: "bg-orange-500/15 text-orange-700" },
    confirmed: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-700" },
    in_progress: { label: "In Progress", color: "bg-teal-500/15 text-teal-700" },
    completed: { label: "Completed", color: "bg-gray-500/15 text-gray-700" },
    cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-700" },
};

const examTypeLabels: Record<string, string> = {
    quiz: "Quiz",
    midterm: "Midterm",
    final: "Final Exam",
    other: "Other",
};

export default function CrashCourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const crashCourseId = params.id as Id<"crash_courses">;

    const { role } = useRole();
    const crashCourse = useQuery(api.crash_courses.get, { crashCourseId });
    const enrollments = useQuery(api.crash_courses.getEnrollments, { crashCourseId });
    const myEnrollment = useQuery(api.crash_courses.getMyEnrollment, { crashCourseId });
    const user = useQuery(api.users.currentUser);

    const enroll = useMutation(api.crash_courses.enroll);
    const withdrawMut = useMutation(api.crash_courses.withdraw);
    const confirmEnrollmentMut = useMutation(api.crash_courses.confirmEnrollment);
    const startVotingMut = useMutation(api.crash_courses.startVoting);
    const selectTutorMut = useMutation(api.crash_courses.selectTutor);
    const lockInMut = useMutation(api.crash_courses.lockIn);
    const startMut = useMutation(api.crash_courses.start);
    const completeMut = useMutation(api.crash_courses.complete);
    const cancelMut = useMutation(api.crash_courses.cancel);
    const applyMut = useMutation(api.crash_courses.apply);
    const tutorReviewMut = useMutation(api.crash_courses.tutorReviewDecision);

    const [isEnrolling, setIsEnrolling] = useState(false);
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [renegotiateDialogOpen, setRenegotiateDialogOpen] = useState(false);
    const [renegotiatePrice, setRenegotiatePrice] = useState("");
    const [isReviewing, setIsReviewing] = useState(false);

    // Apply form state
    const [pitch, setPitch] = useState("");
    const [proposedPrice, setProposedPrice] = useState("");
    const [proposedDate, setProposedDate] = useState("");
    const [proposedTime, setProposedTime] = useState("");
    const [proposedDuration, setProposedDuration] = useState("120");
    const [proposedLocation, setProposedLocation] = useState("");
    const [proposedMinEnrollment, setProposedMinEnrollment] = useState("");
    const [proposedMaxEnrollment, setProposedMaxEnrollment] = useState("");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [isApplying, setIsApplying] = useState(false);

    if (crashCourse === undefined) {
        return (
            <div className="container mx-auto py-10 max-w-3xl">
                <Skeleton className="h-8 w-32 mb-6" />
                <Skeleton className="h-12 w-3/4 mb-4" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (!crashCourse) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Crash Course Not Found</h1>
                <Link href="/crash-courses">
                    <Button variant="outline">Back to Crash Courses</Button>
                </Link>
            </div>
        );
    }

    const isCreator = user?._id === crashCourse.creatorId;
    const isSelectedTutor = !!crashCourse.selectedTutorId && user?._id === crashCourse.selectedTutorId;
    const isTutorRole = role === "tutor";
    const isEnrolled = myEnrollment && myEnrollment.status !== "withdrawn";
    const isPendingConfirmation = myEnrollment?.status === "pending_confirmation";
    const status = statusConfig[crashCourse.status] ?? statusConfig.open;

    const handleEnroll = async () => {
        setIsEnrolling(true);
        try {
            await enroll({ crashCourseId });
            toast.success(
                crashCourse.origin === "supply"
                    ? "Enrolled successfully!"
                    : "You've expressed interest!"
            );
        } catch (error: any) {
            toast.error(error.message ?? "Failed to enroll");
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleWithdraw = async () => {
        try {
            await withdrawMut({ crashCourseId });
            toast.success("Withdrawn successfully");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to withdraw");
        }
    };

    const handleConfirmEnrollment = async () => {
        try {
            await confirmEnrollmentMut({ crashCourseId });
            toast.success("Enrollment confirmed!");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to confirm");
        }
    };

    const handleStartVoting = async () => {
        try {
            await startVotingMut({ crashCourseId });
            toast.success("Voting is now open!");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to start voting");
        }
    };

    const handleLockIn = async (force = false) => {
        try {
            await lockInMut({ crashCourseId, forceLockin: force || undefined });
            toast.success("Crash course confirmed!");
        } catch (error: any) {
            // If it fails due to low enrollment, offer a force option
            if (error.message?.includes("forceLockin")) {
                if (confirm(error.message + "\n\nProceed anyway?")) {
                    handleLockIn(true);
                }
            } else {
                toast.error(error.message ?? "Failed to lock in");
            }
        }
    };

    const handleTutorReview = async (decision: "accept" | "renegotiate" | "cancel") => {
        setIsReviewing(true);
        try {
            if (decision === "renegotiate") {
                const price = parseFloat(renegotiatePrice);
                if (!price || price <= 0) {
                    toast.error("Enter a valid price");
                    setIsReviewing(false);
                    return;
                }
                await tutorReviewMut({ crashCourseId, decision, newPrice: price });
                toast.success("Price renegotiated — students will re-confirm at the new price");
                setRenegotiateDialogOpen(false);
            } else {
                await tutorReviewMut({ crashCourseId, decision });
                toast.success(decision === "accept" ? "Accepted — proceeding with current students" : "Crash course cancelled");
            }
        } catch (error: any) {
            toast.error(error.message ?? "Failed to submit decision");
        } finally {
            setIsReviewing(false);
        }
    };

    const handleStart = async () => {
        try {
            await startMut({ crashCourseId });
            toast.success("Session started!");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to start session");
        }
    };

    const handleComplete = async () => {
        try {
            await completeMut({ crashCourseId });
            toast.success("Session completed!");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to complete");
        }
    };

    const handleCancel = async () => {
        try {
            await cancelMut({ crashCourseId });
            toast.success("Crash course cancelled");
        } catch (error: any) {
            toast.error(error.message ?? "Failed to cancel");
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedTopics.length === 0) {
            toast.error("Please select at least one topic to cover");
            return;
        }
        setIsApplying(true);
        try {
            const dateTime = new Date(`${proposedDate}T${proposedTime}`).getTime();
            await applyMut({
                crashCourseId,
                pitch,
                proposedPrice: parseFloat(proposedPrice),
                proposedDate: dateTime,
                proposedDuration: parseInt(proposedDuration),
                proposedLocation: proposedLocation || undefined,
                topicsCovered: selectedTopics,
                proposedMinEnrollment: proposedMinEnrollment ? parseInt(proposedMinEnrollment) : undefined,
                proposedMaxEnrollment: proposedMaxEnrollment ? parseInt(proposedMaxEnrollment) : undefined,
            });
            toast.success("Application submitted!");
            setApplyDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message ?? "Failed to apply");
        } finally {
            setIsApplying(false);
        }
    };

    const toggleTopic = (topic: string) => {
        setSelectedTopics((prev) =>
            prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
        );
    };

    return (
        <div className="container mx-auto py-10 max-w-6xl px-4">
            {/* Back */}
            <Link
                href="/crash-courses"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Crash Courses
            </Link>

            {/* ═══ Header ═══ */}
            <div className="mb-8">
                {crashCourse.course && (
                    <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-2">
                        {crashCourse.course.code} · {crashCourse.course.name}
                    </p>
                )}

                <div className="flex items-start justify-between gap-4 mb-3">
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                        {crashCourse.title}
                    </h1>
                    <Badge className={`${status.color} border-none text-sm font-semibold px-3 py-1 shrink-0 mt-1`}>
                        {status.label}
                    </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        {crashCourse.origin === "demand" ? "Requested by" : "Offered by"}{" "}
                        <Link
                            href={`/profile/${crashCourse.creator?._id}`}
                            className="font-medium text-foreground hover:underline"
                        >
                            {crashCourse.creator?.name ?? "Unknown"}
                        </Link>
                    </span>
                    <span className="text-border">·</span>
                    <Badge variant="outline" className="text-xs font-normal">
                        {examTypeLabels[crashCourse.examType]}
                    </Badge>
                    {crashCourse.origin === "demand" ? (
                        <Badge variant="outline" className="bg-amber-500/5 text-amber-700 border-amber-200 text-xs font-normal">
                            🔥 Requested
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-blue-500/5 text-blue-700 border-blue-200 text-xs font-normal">
                            📚 Offered
                        </Badge>
                    )}
                </div>
            </div>

            {/* ═══ Two-Column Layout ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                {/* ── Main Content (left) ── */}
                <div className="lg:col-span-3 space-y-8">

                    {/* Student Preferences banner (demand-side, pre-tutor) */}
                    {crashCourse.origin === "demand" &&
                        !crashCourse.selectedTutorId &&
                        (crashCourse.budgetPerStudent || crashCourse.preferredDateRange || crashCourse.preferredDuration) && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-200/30">
                                <span className="text-sm font-semibold text-amber-800 shrink-0">Student Preferences</span>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-amber-700/90">
                                    {crashCourse.preferredDateRange && (
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {crashCourse.preferredDateRange}
                                        </span>
                                    )}
                                    {crashCourse.preferredDuration && (
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            ~{crashCourse.preferredDuration} min
                                        </span>
                                    )}
                                    {crashCourse.budgetPerStudent && (
                                        <span className="flex items-center gap-1.5">
                                            💰 ~PKR {crashCourse.budgetPerStudent.toLocaleString()}/student
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Description */}
                    {crashCourse.description && (
                        <div>
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Description
                            </h2>
                            <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {crashCourse.description}
                            </p>
                        </div>
                    )}

                    {/* Topics */}
                    <div>
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            {crashCourse.origin === "demand" ? "Topics Needed" : "Topics Covered"}
                            <span className="text-muted-foreground/50 font-normal normal-case ml-1">
                                · {crashCourse.topics.length}
                            </span>
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {crashCourse.topics.map((topic) => (
                                <Badge key={topic} variant="secondary" className="px-3 py-1">
                                    {topic}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Tutor Profile (if selected) */}
                    {crashCourse.tutor && (
                        <Card className="border border-border/50">
                            <CardContent className="p-5">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                    {crashCourse.origin === "supply" ? "Instructor" : "Selected Tutor"}
                                </h2>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={crashCourse.tutor.image} />
                                        <AvatarFallback>{crashCourse.tutor.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/profile/${crashCourse.tutor._id}`}
                                                className="font-semibold text-foreground hover:underline truncate"
                                            >
                                                {crashCourse.tutor.name}
                                            </Link>
                                            {crashCourse.tutor.isVerified && (
                                                <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                                            )}
                                            {crashCourse.tutor.isOnline && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    Online
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                            {crashCourse.tutor.reputation?.toFixed(1) ?? "N/A"}
                                        </div>
                                    </div>
                                    <Link href={`/profile/${crashCourse.tutor._id}`}>
                                        <Button variant="outline" size="sm" className="rounded-full shrink-0">
                                            View Profile
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Voting / Applications Section (demand-side) */}
                    {crashCourse.origin === "demand" &&
                        (crashCourse.status === "requesting" ||
                            crashCourse.status === "voting" ||
                            crashCourse.status === "confirming") && (
                            <div>
                                <Separator className="mb-8" />
                                <VotingSection
                                    crashCourseId={crashCourseId}
                                    topics={crashCourse.topics}
                                    votingDeadline={crashCourse.votingDeadline}
                                    status={crashCourse.status}
                                    isEnrolled={!!isEnrolled}
                                />
                            </div>
                        )}

                    {/* Interested / Enrolled Students — Avatar Stack */}
                    {enrollments && enrollments.length > 0 && (
                        <div>
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                {crashCourse.origin === "supply" ? "Enrolled Students" : "Interested Students"}
                                <span className="text-muted-foreground/50 font-normal normal-case ml-1">
                                    · {enrollments.length}
                                </span>
                            </h2>
                            <div className="flex items-center">
                                <div className="flex -space-x-2">
                                    {enrollments.slice(0, 10).map((enrollment) => (
                                        <Avatar
                                            key={enrollment._id}
                                            className="h-9 w-9 border-2 border-background ring-0"
                                            title={`${enrollment.student?.name ?? "Student"} — ${
                                                enrollment.status === "interested"
                                                    ? "Interested"
                                                    : enrollment.status === "pending_confirmation"
                                                        ? "Pending"
                                                        : "Enrolled"
                                            }`}
                                        >
                                            <AvatarImage src={enrollment.student?.image} />
                                            <AvatarFallback className="text-xs">
                                                {enrollment.student?.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                {enrollments.length > 10 && (
                                    <span className="ml-3 text-sm text-muted-foreground">
                                        +{enrollments.length - 10} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Sidebar (right, sticky) ── */}
                <div className="lg:col-span-2">
                    <div className="sticky top-24 space-y-4">

                        {/* Buy-box Card: Price + Schedule + Enrollment + Actions */}
                        <Card className="border border-border/50 shadow-sm">
                            <CardContent className="p-5 space-y-5">

                                {/* Price */}
                                {crashCourse.pricePerStudent ? (
                                    <div>
                                        <p className="text-3xl font-bold text-foreground tracking-tight">
                                            PKR {crashCourse.pricePerStudent.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-muted-foreground">per student</p>
                                    </div>
                                ) : crashCourse.origin === "demand" && crashCourse.budgetPerStudent ? (
                                    <div>
                                        <p className="text-lg font-semibold text-muted-foreground">
                                            Budget ~PKR {crashCourse.budgetPerStudent.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-muted-foreground">per student (estimate)</p>
                                    </div>
                                ) : null}

                                {/* Schedule details */}
                                {(crashCourse.scheduledAt || crashCourse.duration || crashCourse.location) && (
                                    <div className="space-y-3 pt-1">
                                        {crashCourse.scheduledAt && (
                                            <div className="flex items-start gap-3">
                                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {new Date(crashCourse.scheduledAt).toLocaleDateString("en-US", {
                                                            weekday: "long",
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(crashCourse.scheduledAt).toLocaleTimeString("en-US", {
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {crashCourse.duration && (
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <p className="text-sm text-foreground">
                                                    {crashCourse.duration >= 60
                                                        ? `${Math.floor(crashCourse.duration / 60)}h${crashCourse.duration % 60 ? ` ${crashCourse.duration % 60}m` : ""}`
                                                        : `${crashCourse.duration}m`}
                                                </p>
                                            </div>
                                        )}
                                        {crashCourse.location && (
                                            <div className="flex items-center gap-3">
                                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <p className="text-sm text-foreground">{crashCourse.location}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Enrollment */}
                                <div className="pt-3 border-t border-border/40">
                                    <EnrollmentBar
                                        current={crashCourse.currentEnrollment}
                                        max={crashCourse.maxEnrollment}
                                        min={crashCourse.minEnrollment}
                                        label={crashCourse.origin === "supply" ? "Enrollment" : undefined}
                                    />
                                </div>

                                {/* ── Action Buttons ── */}
                                <div className="pt-3 border-t border-border/40 space-y-2">
                                    {/* Student: Enroll / Express Interest */}
                                    {!isEnrolled && !isCreator && !isSelectedTutor && !isTutorRole && (
                                        <>
                                            {crashCourse.origin === "supply" && crashCourse.status === "open" && (
                                                <Button
                                                    onClick={handleEnroll}
                                                    disabled={isEnrolling}
                                                    className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold"
                                                >
                                                    {isEnrolling ? "Enrolling..." : `Enroll — PKR ${crashCourse.pricePerStudent?.toLocaleString() ?? "TBD"}`}
                                                </Button>
                                            )}
                                            {crashCourse.origin === "demand" &&
                                                (crashCourse.status === "requesting" || crashCourse.status === "voting") && (
                                                    <Button
                                                        onClick={handleEnroll}
                                                        disabled={isEnrolling}
                                                        className="w-full rounded-full h-11 bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                                                    >
                                                        {isEnrolling ? "Joining..." : "Join & Vote"}
                                                    </Button>
                                                )}
                                        </>
                                    )}

                                    {/* Confirm Enrollment */}
                                    {isPendingConfirmation && crashCourse.status === "confirming" && (
                                        <Button
                                            onClick={handleConfirmEnrollment}
                                            className="w-full rounded-full h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Confirm — PKR {crashCourse.pricePerStudent?.toLocaleString() ?? "TBD"}
                                        </Button>
                                    )}

                                    {/* Withdraw */}
                                    {isEnrolled && !isCreator && !isTutorRole &&
                                        crashCourse.status !== "completed" && crashCourse.status !== "cancelled" && (
                                            <Button variant="outline" className="w-full rounded-full" onClick={handleWithdraw}>
                                                Withdraw
                                            </Button>
                                        )}

                                    {/* Tutor: Apply to teach (demand-side) */}
                                    {!isCreator &&
                                        !isSelectedTutor &&
                                        isTutorRole &&
                                        crashCourse.origin === "demand" &&
                                        crashCourse.status === "requesting" && (
                                            <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button className="w-full rounded-full h-11 bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                                                        <GraduationCap className="h-4 w-4 mr-2" />
                                                        Apply to Teach
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle>Apply to Teach</DialogTitle>
                                                    </DialogHeader>
                                                    <form onSubmit={handleApply} className="space-y-4 mt-4">
                                                        {crashCourse.budgetPerStudent && (
                                                            <p className="text-sm text-muted-foreground">
                                                                💡 Budget hint: ~PKR {crashCourse.budgetPerStudent.toLocaleString()}/student
                                                            </p>
                                                        )}
                                                        <div className="space-y-2">
                                                            <Label>Price per Student (PKR) *</Label>
                                                            <Input
                                                                type="number"
                                                                value={proposedPrice}
                                                                onChange={(e) => setProposedPrice(e.target.value)}
                                                                placeholder="350"
                                                                required
                                                                min={1}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <Label>Date *</Label>
                                                                <Input
                                                                    type="date"
                                                                    value={proposedDate}
                                                                    onChange={(e) => setProposedDate(e.target.value)}
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Time *</Label>
                                                                <Input
                                                                    type="time"
                                                                    value={proposedTime}
                                                                    onChange={(e) => setProposedTime(e.target.value)}
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <Label>Duration (min) *</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={proposedDuration}
                                                                    onChange={(e) => setProposedDuration(e.target.value)}
                                                                    required
                                                                    min={15}
                                                                    max={480}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Location</Label>
                                                                <Input
                                                                    value={proposedLocation}
                                                                    onChange={(e) => setProposedLocation(e.target.value)}
                                                                    placeholder="Zoom / Room"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <Label>Min Students</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={proposedMinEnrollment}
                                                                    onChange={(e) => setProposedMinEnrollment(e.target.value)}
                                                                    placeholder="e.g. 8"
                                                                    min={1}
                                                                    max={200}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Max Students</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={proposedMaxEnrollment}
                                                                    onChange={(e) => setProposedMaxEnrollment(e.target.value)}
                                                                    placeholder="e.g. 30"
                                                                    min={2}
                                                                    max={200}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Topics you&apos;ll cover *</Label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {crashCourse.topics.map((topic) => (
                                                                    <Badge
                                                                        key={topic}
                                                                        variant={selectedTopics.includes(topic) ? "default" : "outline"}
                                                                        className={`cursor-pointer transition-colors ${
                                                                            selectedTopics.includes(topic)
                                                                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                                                : "hover:bg-foreground/5"
                                                                        }`}
                                                                        onClick={() => toggleTopic(topic)}
                                                                    >
                                                                        {selectedTopics.includes(topic) && <Check className="h-3 w-3 mr-1" />}
                                                                        {topic}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Your Pitch *</Label>
                                                            <Textarea
                                                                value={pitch}
                                                                onChange={(e) => setPitch(e.target.value)}
                                                                placeholder="Why should students pick you? Mention your experience with this course..."
                                                                required
                                                                rows={4}
                                                                maxLength={5000}
                                                            />
                                                        </div>
                                                        <Button
                                                            type="submit"
                                                            disabled={isApplying}
                                                            className="w-full rounded-full h-11 font-semibold"
                                                        >
                                                            {isApplying ? "Submitting..." : "Submit Application →"}
                                                        </Button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}

                                    {/* Creator: Start Voting */}
                                    {isCreator && crashCourse.status === "requesting" && (
                                        <Button
                                            onClick={handleStartVoting}
                                            className="w-full rounded-full h-11 font-semibold"
                                        >
                                            <Vote className="h-4 w-4 mr-2" />
                                            Open Voting
                                        </Button>
                                    )}

                                    {/* Lock In */}
                                    {(isCreator || isSelectedTutor) &&
                                        (crashCourse.status === "confirming" || crashCourse.status === "pending_tutor_review") && (
                                            <Button
                                                onClick={() => handleLockIn()}
                                                className="w-full rounded-full h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                            >
                                                <Check className="h-4 w-4 mr-2" />
                                                Lock In & Confirm
                                            </Button>
                                        )}

                                    {/* Start Session */}
                                    {(isSelectedTutor || isCreator) && crashCourse.status === "confirmed" && (
                                        <Button
                                            onClick={handleStart}
                                            className="w-full rounded-full h-11 bg-teal-600 text-white hover:bg-teal-700 font-semibold"
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Start Session
                                        </Button>
                                    )}

                                    {/* Complete */}
                                    {(isSelectedTutor || isCreator) && crashCourse.status === "in_progress" && (
                                        <Button
                                            onClick={handleComplete}
                                            className="w-full rounded-full h-11 font-semibold"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Mark Completed
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Confirmation deadline alert */}
                        {crashCourse.status === "confirming" && crashCourse.confirmationDeadline && (
                            <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-200/50">
                                <p className="text-sm font-medium text-violet-700">
                                    ⚠ Confirm by{" "}
                                    {new Date(crashCourse.confirmationDeadline).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}{" "}
                                    ({formatDistanceToNow(new Date(crashCourse.confirmationDeadline), { addSuffix: true })})
                                </p>
                            </div>
                        )}

                        {/* Tutor Review Panel (low enrollment) */}
                        {crashCourse.status === "pending_tutor_review" && isSelectedTutor && (
                            <Card className="border-orange-300/50 bg-orange-50/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base text-orange-700">⚠ Low Enrollment</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-orange-700/80">
                                        Only <strong>{crashCourse.currentEnrollment}</strong> confirmed
                                        {crashCourse.minEnrollment ? (
                                            <> of {crashCourse.minEnrollment} needed.</>
                                        ) : (
                                            <>.</>
                                        )}
                                    </p>
                                    <div className="space-y-2">
                                        <Button
                                            onClick={() => handleTutorReview("accept")}
                                            disabled={isReviewing}
                                            size="sm"
                                            className="w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Accept ({crashCourse.currentEnrollment} student{crashCourse.currentEnrollment !== 1 ? "s" : ""})
                                        </Button>

                                        <Dialog open={renegotiateDialogOpen} onOpenChange={setRenegotiateDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    disabled={isReviewing}
                                                    size="sm"
                                                    className="w-full rounded-full border-orange-300 text-orange-700 hover:bg-orange-100 font-semibold"
                                                >
                                                    Renegotiate Price
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Renegotiate Price</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 pt-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        Current: <strong>PKR {crashCourse.pricePerStudent?.toLocaleString()}</strong>/student.
                                                        Students get 24h to re-confirm.
                                                    </p>
                                                    <div className="space-y-2">
                                                        <Label>New Price per Student (PKR)</Label>
                                                        <Input
                                                            type="number"
                                                            value={renegotiatePrice}
                                                            onChange={(e) => setRenegotiatePrice(e.target.value)}
                                                            placeholder={String((crashCourse.pricePerStudent ?? 0) * 1.5)}
                                                            min={1}
                                                        />
                                                    </div>
                                                    <Button
                                                        onClick={() => handleTutorReview("renegotiate")}
                                                        disabled={isReviewing}
                                                        className="w-full rounded-full h-11 bg-orange-600 text-white hover:bg-orange-700 font-semibold"
                                                    >
                                                        {isReviewing ? "Submitting..." : "Propose New Price →"}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleTutorReview("cancel")}
                                            disabled={isReviewing}
                                            size="sm"
                                            className="w-full rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancel (No Penalty)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Student banner: tutor reviewing */}
                        {crashCourse.status === "pending_tutor_review" && !isSelectedTutor && isEnrolled && (
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-200/50">
                                <p className="text-sm font-medium text-orange-700">
                                    ⏳ Tutor is reviewing enrollment. You&apos;ll be notified soon.
                                </p>
                            </div>
                        )}

                        {/* Cancel — subtle link at sidebar bottom */}
                        {(isCreator || isSelectedTutor) &&
                            crashCourse.status !== "completed" &&
                            crashCourse.status !== "cancelled" && (
                                <button
                                    onClick={handleCancel}
                                    className="w-full text-center text-sm text-red-500/70 hover:text-red-600 transition-colors py-2"
                                >
                                    Cancel this crash course
                                </button>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}
