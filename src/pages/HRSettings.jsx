import React, { useContext, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  Settings,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
  Shield,
  Plus,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

const HRSettings = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState({
    email_notifications_enabled: true,
    calendar_sync_enabled: true,
    google_connected: false
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Add user dialog state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("employee");
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (user?.role !== "hr") return;
    fetchData();
    
    // Check if Google was just connected
    if (searchParams.get("google_connected") === "true") {
      toast.success("Google account connected successfully!");
    }
  }, [user, searchParams]);

  const fetchData = async () => {
    try {
      const [settingsRes, usersRes] = await Promise.all([
        axios.get(`${API}/settings`),
        axios.get(`${API}/users`)
      ]);
      setSettings(settingsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await axios.put(
        `${API}/settings?email_notifications_enabled=${newSettings.email_notifications_enabled}&calendar_sync_enabled=${newSettings.calendar_sync_enabled}`
      );
      toast.success("Settings updated");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
      // Revert
      setSettings(settings);
    }
  };

  const connectGoogle = async () => {
    try {
      const response = await axios.get(`${API}/oauth/google/login`);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      toast.error("Failed to connect Google account");
    }
  };

  const disconnectGoogle = async () => {
    try {
      await axios.post(`${API}/oauth/google/disconnect`);
      setSettings({ ...settings, google_connected: false });
      toast.success("Google account disconnected");
    } catch (error) {
      console.error("Error disconnecting Google:", error);
      toast.error("Failed to disconnect Google account");
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/users/${userId}/role?role=${newRole}`);
      toast.success("User role updated");
      fetchData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    if (!newUserEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setAddingUser(true);
    try {
      await axios.post(`${API}/users`, {
        email: newUserEmail.trim(),
        name: newUserName.trim(),
        role: newUserRole
      });
      toast.success("User added successfully");
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("employee");
      fetchData();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error.response?.data?.detail || "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success("User deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.detail || "Failed to delete user");
    }
  };

  if (user?.role !== "hr") {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Access denied. HR role required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Settings
        </h1>
        <p className="text-slate-600 mt-1">
          Configure notifications, calendar sync, and user permissions
        </p>
      </div>

      <div className="grid gap-6">
        {/* Google Integration */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Google Integration
            </CardTitle>
            <CardDescription>
              Connect your Google account to enable Gmail notifications and Google Calendar sync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.google_connected ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <p className="font-medium text-slate-900">
                    {settings.google_connected ? "Connected" : "Not Connected"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {settings.google_connected 
                      ? "Gmail and Calendar are synced"
                      : "Connect to enable email notifications and calendar sync"}
                  </p>
                </div>
              </div>
              {settings.google_connected ? (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={disconnectGoogle}
                  data-testid="disconnect-google-btn"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  className="btn-primary flex items-center gap-2"
                  onClick={connectGoogle}
                  data-testid="connect-google-btn"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Connect Google
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure when and how notifications are sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-500">
                  Send email notifications for requests, approvals, and rejections
                </p>
              </div>
              <Switch
                checked={settings.email_notifications_enabled}
                onCheckedChange={(checked) => updateSettings("email_notifications_enabled", checked)}
                data-testid="email-notifications-switch"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Calendar Sync</p>
                <p className="text-sm text-slate-500">
                  Automatically add approved holidays to Google Calendar
                </p>
              </div>
              <Switch
                checked={settings.calendar_sync_enabled}
                onCheckedChange={(checked) => updateSettings("calendar_sync_enabled", checked)}
                data-testid="calendar-sync-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                User Management
              </CardTitle>
              <CardDescription>
                Add, remove, and manage user roles
              </CardDescription>
            </div>
            <Button
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsAddUserOpen(true)}
              data-testid="add-user-btn"
            >
              <Plus size={18} />
              Add User
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Change Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u.user_id}
                      className="animate-slide-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                      data-testid={`user-row-${u.user_id}`}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-600">
                              {u.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "hr" ? "badge-approved" : "badge-pending"}`}>
                          {u.role === "hr" ? "HR" : "Employee"}
                        </span>
                      </td>
                      <td>
                        <Select
                          value={u.role}
                          onValueChange={(value) => updateUserRole(u.user_id, value)}
                          disabled={u.user_id === user.user_id}
                        >
                          <SelectTrigger 
                            className="w-32"
                            data-testid={`role-select-${u.user_id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        {u.user_id !== user.user_id ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`delete-user-btn-${u.user_id}`}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{u.name}</strong>? This will also delete all their holiday requests and credits. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteUser(u.user_id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-xs text-slate-400">You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bento-card bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Credit Expiration Policy</p>
                <p className="text-sm text-blue-700 mt-1">
                  Holiday credits from year N-1 are automatically deleted on July 31st of year N. 
                  A reminder notification is sent one month before the expiration date.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="form-label">Email Address</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                data-testid="new-user-email-input"
              />
            </div>
            <div>
              <Label className="form-label">Full Name</Label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
                data-testid="new-user-name-input"
              />
            </div>
            <div>
              <Label className="form-label">Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger data-testid="new-user-role-select">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="hr">HR Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-500">
              The user will be able to login with Google using this email address. Default holiday credits will be assigned automatically.
            </p>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="btn-primary"
                onClick={handleAddUser}
                disabled={addingUser}
                data-testid="confirm-add-user-btn"
              >
                {addingUser ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRSettings;
