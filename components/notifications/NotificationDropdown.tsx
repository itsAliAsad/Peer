"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function NotificationDropdown() {
    const { results, status, loadMore } = usePaginatedQuery(
        api.notifications.list,
        {},
        { initialNumItems: 20 }
    );
    const markRead = useMutation(api.notifications.markRead);
    const markAllRead = useMutation(api.notifications.markAllRead);
    const router = useRouter();

    if (status === "LoadingFirstPage") {
        return (
            <Button variant="ghost" size="icon" disabled>
                <Bell className="h-5 w-5" />
            </Button>
        );
    }

    const notifications = results ?? [];
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const getMessageNotificationMeta = (notification: typeof notifications[number]) => {
        if (notification.type !== "new_message" || !("count" in notification.data)) {
            return null;
        }

        const sender =
            "sender" in notification &&
            notification.sender &&
            typeof notification.sender === "object" &&
            "name" in notification.sender
                ? notification.sender
                : undefined;

        return {
            count: notification.data.count,
            senderName:
                sender && typeof sender.name === "string" ? sender.name : undefined,
        };
    };

    const handleNotificationClick = async (notification: typeof notifications[0]) => {
        if (!notification.isRead) {
            await markRead({ notificationId: notification._id });
        }

        // Navigate based on type
        const ticketId = notification.data?.ticketId || notification.data?.requestId;
        const crashCourseId = notification.data?.crashCourseId;
        switch (notification.type) {
            case "offer_received":
                if (ticketId) {
                    router.push(`/requests/${ticketId}`);
                }
                break;
            case "offer_accepted":
                if (ticketId) {
                    router.push(`/requests/${ticketId}`);
                }
                break;
            case "ticket_resolved":
                if (ticketId) {
                    router.push(`/requests/${ticketId}`);
                }
                break;
            case "new_message":
                if (notification.data?.conversationId) {
                    router.push(`/messages?conversation=${notification.data.conversationId}`);
                } else {
                    router.push(`/messages`);
                }
                break;
            case "credential_reviewed":
                router.push(`/profile`);
                break;
            case "crash_course_application":
            case "crash_course_vote_open":
            case "crash_course_selected":
            case "crash_course_confirmed":
            case "crash_course_reminder":
            case "crash_course_cancelled":
            case "crash_course_low_enrollment":
                if (crashCourseId) {
                    router.push(`/crash-courses/${crashCourseId}`);
                } else {
                    router.push(`/crash-courses`);
                }
                break;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto p-0"
                            onClick={() => markAllRead()}
                        >
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification._id}
                            className={cn(
                                "flex flex-col items-start gap-1 p-3 cursor-pointer",
                                !notification.isRead && "bg-muted/50"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            {(() => {
                                const messageMeta = getMessageNotificationMeta(notification);
                                return (
                            <div className="font-medium text-sm">
                                {notification.type === "offer_received" && "New Offer Received"}
                                {notification.type === "offer_accepted" && "Offer Accepted"}
                                {notification.type === "ticket_resolved" && "Ticket Resolved"}
                                {notification.type === "credential_reviewed" && "Credential Review Update"}
                                {notification.type === "new_message" && (
                                    <>
                                        {messageMeta && messageMeta.count > 1
                                            ? `${messageMeta.count} new messages`
                                            : "New Message"}
                                        {messageMeta?.senderName &&
                                            ` from ${messageMeta.senderName}`}
                                    </>
                                )}
                                {notification.type === "crash_course_application" && "New Tutor Application"}
                                {notification.type === "crash_course_vote_open" && "Voting Started"}
                                {notification.type === "crash_course_selected" && "Tutor Selected"}
                                {notification.type === "crash_course_confirmed" && "Crash Course Confirmed"}
                                {notification.type === "crash_course_reminder" && "Crash Course Reminder"}
                                {notification.type === "crash_course_cancelled" && "Crash Course Cancelled"}
                                {notification.type === "crash_course_low_enrollment" && "Low Enrollment"}
                            </div>
                                );
                            })()}
                            <div className="text-xs text-muted-foreground">
                                {new Date(notification.createdAt).toLocaleDateString()}{" "}
                                {new Date(notification.createdAt).toLocaleTimeString()}
                            </div>
                        </DropdownMenuItem>
                    ))
                )}
                {status === "CanLoadMore" && notifications.length > 0 && (
                    <DropdownMenuItem
                        className="justify-center text-xs text-muted-foreground cursor-pointer"
                        onClick={() => loadMore(20)}
                    >
                        Load more
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
