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
  ArrowRight,
  Briefcase,
  Heart,
  Baby,
  Thermometer,
  MinusCircle
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { format, differenceInBusinessDays, addDays } from "date-fns";

// Category icons mapping
const categoryIcons = {
  paid_holiday: Briefcase,
  unpaid_leave: DollarOff,
  sick_leave: Thermometer,
  parental_leave: Heart,
  maternity_leave: Baby
};

// Category colors mapping
const categoryColors = {
  paid_holiday: "bg-blue-100 text-blue-700 border-blue-200",
  unpaid_leave: "bg-slate-100 text-slate-700 border-slate-200",
  sick_leave: "bg-red-100 text-red-700 border-red-200",
  parental_leave: "bg-purple-100 text-purple-700 border-purple-200",
  maternity_leave: "bg-pink-100 text-pink-700 border-pink-200"
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState("paid_holiday");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [creditsRes, requestsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/credits/my`),
        axios.get(`${API}/requests/my`),
        axios.get(`${API}/categories`),
      ]);
      setCredits(creditsRes.data);
      setRequests(requestsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentYearCredits = credits.filter(c => c.year === currentYear);
  
  const getCreditForCategory = (categoryId) => {
    return currentYearCredits.find(c => c.category === categoryId) || {
      total_days: 0,
      used_days: 0,
      remaining_days: 0
    };
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

    const selectedCredit = getCreditForCategory(selectedCategory);
    if (daysCount > selectedCredit.remaining_days) {
      const categoryName = categories.find(c => c.id === selectedCategory)?.name || selectedCategory;
      toast.error(`Insufficient ${categoryName} credits. Available: ${selectedCredit.remaining_days} days`);
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/requests`, {
        category: selectedCategory,
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
      setSelectedCategory("paid_holiday");
      fetchData();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const recentRequests = requests.slice(0, 5);
  const getCategoryName = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
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
              <DialogTitle>Request Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Category Selection */}
              <div>
                <Label className="form-label">Leave Type</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => {
                      const credit = getCreditForCategory(cat.id);
                      const Icon = categoryIcons[cat.id] || Briefcase;
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <Icon size={16} />
                            <span>{cat.name}</span>
                            <span className="text-xs text-slate-500">
                              ({credit.remaining_days} days left)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

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

      {/* Credits by Category */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Leave Balance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map(cat => {
            const credit = getCreditForCategory(cat.id);
            const Icon = categoryIcons[cat.id] || Briefcase;
            const colorClass = categoryColors[cat.id] || "bg-slate-100 text-slate-700";
            const percentage = credit.total_days > 0 
              ? (credit.remaining_days / credit.total_days) * 100 
              : 0;
            
            return (
              <Card key={cat.id} className="bento-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 truncate">{cat.name}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">{credit.remaining_days}</span>
                    <span className="text-sm text-slate-500">/ {credit.total_days}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage > 50 ? "bg-emerald-500" :
                        percentage > 20 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bento-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-xl font-bold text-amber-600">{pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Approved</p>
                <p className="text-xl font-bold text-emerald-600">{approvedRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bento-card col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Requests</p>
                  <p className="text-xl font-bold text-slate-900">{requests.length}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600"
                onClick={() => navigate("/my-requests")}
              >
                View All <ArrowRight size={16} className="ml-1" />
              </Button>
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
                Click "New Request" to submit your first leave request
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req, idx) => {
                const Icon = categoryIcons[req.category] || Briefcase;
                const colorClass = categoryColors[req.category] || "bg-slate-100 text-slate-700";
                return (
                  <div
                    key={req.request_id}
                    className={`request-card request-card-${req.status} bg-white border border-slate-100 rounded-lg p-4 animate-slide-in`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    data-testid={`request-card-${req.request_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-700">
                              {getCategoryName(req.category)}
                            </span>
                            <span className={`badge badge-${req.status}`}>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900">
                            {req.start_date} → {req.end_date}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            {req.days_count} day(s) • {req.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
