import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Filter,
  MessageSquare,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
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
import { Label } from "../components/ui/label";

const HRDashboard = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [hrComment, setHrComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.role !== "hr") return;
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/requests/all`);
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await axios.put(
        `${API}/requests/${selectedRequest.request_id}/approve?hr_comment=${encodeURIComponent(hrComment)}`
      );
      toast.success("Request approved successfully");
      setSelectedRequest(null);
      setHrComment("");
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(error.response?.data?.detail || "Failed to approve request");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await axios.put(
        `${API}/requests/${selectedRequest.request_id}/reject?hr_comment=${encodeURIComponent(hrComment)}`
      );
      toast.success("Request rejected");
      setSelectedRequest(null);
      setHrComment("");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(error.response?.data?.detail || "Failed to reject request");
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesFilter = filter === "all" || req.status === filter;
    const matchesSearch = search === "" || 
      req.user_name.toLowerCase().includes(search.toLowerCase()) ||
      req.user_email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
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
          HR Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Manage all holiday requests from employees
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bento-card cursor-pointer hover:border-slate-300" onClick={() => setFilter("all")}>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bento-card cursor-pointer hover:border-amber-300" onClick={() => setFilter("pending")}>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bento-card cursor-pointer hover:border-emerald-300" onClick={() => setFilter("approved")}>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bento-card cursor-pointer hover:border-red-300" onClick={() => setFilter("rejected")}>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40" data-testid="status-filter">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <Card className="bento-card overflow-hidden">
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="empty-state py-12">
              <User className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req, idx) => (
                    <tr 
                      key={req.request_id}
                      className="animate-slide-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                      data-testid={`hr-request-row-${req.request_id}`}
                    >
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">{req.user_name}</p>
                          <p className="text-sm text-slate-500">{req.user_email}</p>
                        </div>
                      </td>
                      <td className="mono text-sm">
                        {req.start_date} → {req.end_date}
                      </td>
                      <td className="font-medium">{req.days_count}</td>
                      <td className="max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td>
                        <span className={`badge badge-${req.status}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {req.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(req);
                              setHrComment("");
                            }}
                            data-testid={`review-btn-${req.request_id}`}
                          >
                            Review
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {req.processed_at ? new Date(req.processed_at).toLocaleDateString() : "-"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedRequest.user_name}</p>
                <p className="text-sm text-slate-600">{selectedRequest.user_email}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Dates</p>
                  <p className="font-medium mono">
                    {selectedRequest.start_date} → {selectedRequest.end_date}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Days Requested</p>
                  <p className="font-medium">{selectedRequest.days_count} days</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-sm mb-1">Reason</p>
                <p className="text-slate-900">{selectedRequest.reason}</p>
              </div>

              <div>
                <Label className="form-label">Comment (optional)</Label>
                <Textarea
                  value={hrComment}
                  onChange={(e) => setHrComment(e.target.value)}
                  placeholder="Add a comment for the employee..."
                  data-testid="hr-comment-input"
                />
              </div>

              <DialogFooter className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={handleReject}
                  disabled={processing}
                  data-testid="reject-btn"
                >
                  <XCircle size={16} className="mr-2" />
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleApprove}
                  disabled={processing}
                  data-testid="approve-btn"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRDashboard;
