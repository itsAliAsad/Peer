"use client";

import AdminGuard from "@/components/admin/AdminGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsTable from "@/components/admin/ReportsTable";
import UserManagement from "@/components/admin/UserManagement";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function AdminPage() {
    const stats = useQuery(api.admin.getStats);
    const createAnnouncement = useMutation(api.admin.createAnnouncement);
    const announcements = useQuery(api.admin.listAnnouncements);
    const setAnnouncementStatus = useMutation(api.admin.setAnnouncementStatus);
    const auditLogs = useQuery(api.admin.getAuditLogs, { limit: 50 });
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementContent, setAnnouncementContent] = useState("");

    const handleAnnouncement = async () => {
        try {
            await createAnnouncement({
                title: announcementTitle,
                content: announcementContent,
            });
            toast.success("Announcement created");
            setAnnouncementTitle("");
            setAnnouncementContent("");
        } catch {
            toast.error("Failed to create announcement");
        }
    };

    const handleToggleAnnouncement = async (id: Id<"announcements">, isActive: boolean) => {
        try {
            await setAnnouncementStatus({ id, isActive });
            toast.success(isActive ? "Announcement activated" : "Announcement deactivated");
        } catch {
            toast.error("Failed to update announcement");
        }
    };

    return (
        <AdminGuard>
            <div className="container mx-auto py-10">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

                {stats && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.usersCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.requestsCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.reportsCount}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Announcement</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Input
                                    placeholder="Title"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                />
                                <Textarea
                                    placeholder="Content"
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                />
                                <Button onClick={handleAnnouncement}>Post Announcement</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Manage Announcements</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {announcements?.length ? (
                                    announcements.map((announcement) => (
                                        <div
                                            key={announcement._id}
                                            className="flex items-start justify-between gap-4 border p-3 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-semibold">{announcement.title}</p>
                                                <p className="text-sm text-muted-foreground">{announcement.content}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={announcement.isActive}
                                                    onCheckedChange={(checked) =>
                                                        handleToggleAnnouncement(announcement._id, checked)
                                                    }
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    {announcement.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No announcements yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="users">
                        <UserManagement />
                    </TabsContent>
                    <TabsContent value="reports">
                        <ReportsTable />
                    </TabsContent>
                    <TabsContent value="audit">
                        <Card>
                            <CardHeader>
                                <CardTitle>Audit Logs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Time</th>
                                                <th className="text-left p-2">Actor</th>
                                                <th className="text-left p-2">Action</th>
                                                <th className="text-left p-2">Target</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs?.length ? (
                                                auditLogs.map((log) => (
                                                    <tr key={log._id} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 text-muted-foreground">
                                                            {new Date(log.createdAt).toLocaleString()}
                                                        </td>
                                                        <td className="p-2">{log.actorName || "System"}</td>
                                                        <td className="p-2 font-mono text-xs">{log.action}</td>
                                                        <td className="p-2 text-muted-foreground">
                                                            {log.targetType || "-"}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                                        No audit logs yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminGuard>
    );
}
