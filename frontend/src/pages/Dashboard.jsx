import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  TrendingUp,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Calendar as CalendarPicker } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format, differenceInBusinessDays, addDays } from "date-fns";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [creditsRes, requestsRes] = await Promise.all([
        axios.get(`${API}/credits/my`),
        axios.get(`${API}/requests/my`),
      ]);
      setCredits(creditsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const currentYearCredit = credits.find(c => c.year === new Date().getFullYear()) || {
    total_days: 35,
    used_days: 0,
    remaining_days: 35
  };

  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const approvedRequests = requests.filter(r => r.status === "approved").length;

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    return differenceInBusinessDays(endDate, startDate) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    const daysCount = calculateDays();
    if (daysCount <= 0) {
      toast.error("End date must be after start date");
      return;
    }

    if (daysCount > currentYearCredit.remaining_days) {
      toast.error("Insufficient holiday credits");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/requests`, {
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        days_count: daysCount,
        reason: reason.trim()
      });
      toast.success("Holiday request submitted successfully");
      setIsDialogOpen(false);
      setStartDate(null);
      setEndDate(null);
      setReason("");
      fetchData();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const recentRequests = requests.slice(0, 5);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your holidays and track your leave balance
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="btn-primary flex items-center gap-2"
              data-testid="new-request-btn"
            >
              <Plus size={20} />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Holiday</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="form-label">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="start-date-btn"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="form-label">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="end-date-btn"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < (startDate || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <strong>{calculateDays()}</strong> business day(s) requested
                </div>
              )}

              <div>
                <Label className="form-label">Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your reason for leave..."
                  className="min-h-[100px]"
                  data-testid="reason-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={submitting}
                  data-testid="submit-request-btn"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="bento-grid mb-8">
        {/* Remaining Days Card */}
        <Card className="bento-card bento-card-large stat-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">
                  Remaining Days
                </p>
                <p className="text-4xl font-bold text-slate-900">
                  {currentYearCredit.remaining_days}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  of {currentYearCredit.total_days} total days
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(currentYearCredit.remaining_days / currentYearCredit.total_days) * 100}%`
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pending Card */}
        <Card className="bento-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{pendingRequests}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approved Card */}
        <Card className="bento-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Approved</p>
                <p className="text-3xl font-bold text-emerald-600">{approvedRequests}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card className="bento-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Recent Requests</CardTitle>
          <Button
            variant="ghost"
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => navigate("/my-requests")}
            data-testid="view-all-requests-btn"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No requests yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Click "New Request" to submit your first holiday request
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req, idx) => (
                <div
                  key={req.request_id}
                  className={`request-card request-card-${req.status} bg-white border border-slate-100 rounded-lg p-4 animate-slide-in`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  data-testid={`request-card-${req.request_id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {req.start_date} → {req.end_date}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {req.days_count} day(s) • {req.reason}
                      </p>
                    </div>
                    <span className={`badge badge-${req.status}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
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

export default Dashboard;
