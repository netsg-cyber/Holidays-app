import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const MyRequests = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/requests/my`);
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

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
          My Requests
        </h1>
        <p className="text-slate-600 mt-1">
          View and track all your holiday requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bento-card">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Approved</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Filter size={20} className="text-slate-500" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40" data-testid="filter-select">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <Card className="bento-card">
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="empty-state py-12">
              <Calendar className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No requests found</p>
              <p className="text-sm text-slate-500 mt-1">
                {filter === "all"
                  ? "You haven't submitted any holiday requests yet"
                  : `No ${filter} requests`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((req, idx) => (
                <div
                  key={req.request_id}
                  className={`p-6 hover:bg-slate-50 transition-colors animate-slide-in request-card request-card-${req.status}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  data-testid={`request-item-${req.request_id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(req.status)}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`badge badge-${req.status}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                          <span className="text-sm text-slate-500 mono">
                            {req.days_count} day(s)
                          </span>
                        </div>
                        <p className="font-medium text-slate-900 mb-1">
                          {req.start_date} → {req.end_date}
                        </p>
                        <p className="text-sm text-slate-600">{req.reason}</p>
                        
                        {req.hr_comment && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <MessageSquare size={14} />
                              <span className="font-medium">HR Comment:</span>
                            </div>
                            <p className="text-sm text-slate-700 mt-1">{req.hr_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>Submitted</p>
                      <p className="mono">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequests;
