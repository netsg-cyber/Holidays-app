import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  CreditCard,
  User,
  Plus,
  Search,
  Edit,
  Briefcase,
  Heart,
  Baby,
  Thermometer,
  MinusCircle,
  PlusCircle,
  Minus,
  Clock,
  CalendarDays,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

// Category icons mapping
const categoryIcons = {
  paid_holiday: Briefcase,
  unpaid_leave: MinusCircle,
  sick_leave: Thermometer,
  parental_leave: Heart,
  maternity_leave: Baby,
  compensatory_rest: Clock
};

// Category colors mapping
const categoryColors = {
  paid_holiday: "bg-blue-100 text-blue-700 border-blue-200",
  unpaid_leave: "bg-slate-100 text-slate-700 border-slate-200",
  sick_leave: "bg-red-100 text-red-700 border-red-200",
  parental_leave: "bg-purple-100 text-purple-700 border-purple-200",
  maternity_leave: "bg-pink-100 text-pink-700 border-pink-200",
  compensatory_rest: "bg-teal-100 text-teal-700 border-teal-200"
};

const HRCredits = () => {
  const { user } = useContext(AuthContext);
  const [credits, setCredits] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Assign credits dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [formUser, setFormUser] = useState("");
  const [formCategory, setFormCategory] = useState("paid_holiday");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [totalDays, setTotalDays] = useState("35");
  const [expiresAt, setExpiresAt] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Adjust credits dialog
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [adjustingCredit, setAdjustingCredit] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("reduce");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  
  // Expiration dialog
  const [isExpirationDialogOpen, setIsExpirationDialogOpen] = useState(false);
  const [expirationCredit, setExpirationCredit] = useState(null);
  const [newExpirationDate, setNewExpirationDate] = useState(null);
  const [savingExpiration, setSavingExpiration] = useState(false);

  useEffect(() => {
    if (user?.role !== "hr") return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [creditsRes, usersRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/credits/all`),
        axios.get(`${API}/users`),
        axios.get(`${API}/categories`)
      ]);
      setCredits(creditsRes.data);
      setUsers(usersRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formUser || !totalDays || !formCategory) {
      toast.error("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/credits`, {
        user_id: formUser,
        year: parseInt(formYear),
        category: formCategory,
        total_days: parseFloat(totalDays),
        expires_at: expiresAt ? format(expiresAt, "yyyy-MM-dd") : null
      });
      toast.success("Credits updated successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving credits:", error);
      toast.error(error.response?.data?.detail || "Failed to save credits");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    const adjustment = adjustmentType === "reduce" ? -amount : amount;

    setAdjusting(true);
    try {
      await axios.put(`${API}/credits/adjust`, {
        user_id: adjustingCredit.user_id,
        year: adjustingCredit.year,
        category: adjustingCredit.category,
        adjustment: adjustment,
        reason: adjustmentReason
      });
      toast.success(`Credits ${adjustmentType === "reduce" ? "reduced" : "added"} successfully`);
      closeAdjustDialog();
      fetchData();
    } catch (error) {
      console.error("Error adjusting credits:", error);
      toast.error(error.response?.data?.detail || "Failed to adjust credits");
    } finally {
      setAdjusting(false);
    }
  };

  const handleUpdateExpiration = async () => {
    setSavingExpiration(true);
    try {
      await axios.put(`${API}/credits/expiration`, {
        user_id: expirationCredit.user_id,
        year: expirationCredit.year,
        category: expirationCredit.category,
        expires_at: newExpirationDate ? format(newExpirationDate, "yyyy-MM-dd") : null
      });
      toast.success("Expiration date updated successfully");
      closeExpirationDialog();
      fetchData();
    } catch (error) {
      console.error("Error updating expiration:", error);
      toast.error(error.response?.data?.detail || "Failed to update expiration date");
    } finally {
      setSavingExpiration(false);
    }
  };

  const resetForm = () => {
    setFormUser("");
    setFormCategory("paid_holiday");
    setFormYear(new Date().getFullYear().toString());
    setTotalDays("35");
    setExpiresAt(null);
    setEditingCredit(null);
  };

  const openEditDialog = (credit) => {
    setEditingCredit(credit);
    setFormUser(credit.user_id);
    setFormCategory(credit.category || "paid_holiday");
    setFormYear(credit.year.toString());
    setTotalDays(credit.total_days.toString());
    setExpiresAt(credit.expires_at ? parseISO(credit.expires_at) : null);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openAdjustDialog = (credit) => {
    setAdjustingCredit(credit);
    setAdjustmentAmount("");
    setAdjustmentType("reduce");
    setAdjustmentReason("");
    setIsAdjustDialogOpen(true);
  };

  const closeAdjustDialog = () => {
    setIsAdjustDialogOpen(false);
    setAdjustingCredit(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
  };

  const openExpirationDialog = (credit) => {
    setExpirationCredit(credit);
    setNewExpirationDate(credit.expires_at ? parseISO(credit.expires_at) : null);
    setIsExpirationDialogOpen(true);
  };

  const closeExpirationDialog = () => {
    setIsExpirationDialogOpen(false);
    setExpirationCredit(null);
    setNewExpirationDate(null);
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const expDate = parseISO(expiresAt);
    const warningDate = addDays(new Date(), 30);
    return isBefore(expDate, warningDate) && isAfter(expDate, new Date());
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return isBefore(parseISO(expiresAt), new Date());
  };

  // Group credits by user for the selected year
  const filteredCredits = credits.filter(c => {
    const matchesYear = c.year.toString() === selectedYear;
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchesSearch = search === "" || 
      c.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchesYear && matchesCategory && matchesSearch;
  });

  // Group by user
  const groupedByUser = filteredCredits.reduce((acc, credit) => {
    if (!acc[credit.user_id]) {
      acc[credit.user_id] = {
        user_id: credit.user_id,
        user_name: credit.user_name,
        user_email: credit.user_email,
        credits: []
      };
    }
    acc[credit.user_id].credits.push(credit);
    return acc;
  }, {});

  const years = [
    (new Date().getFullYear() - 1).toString(),
    new Date().getFullYear().toString(),
    (new Date().getFullYear() + 1).toString()
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Holiday Credits
          </h1>
          <p className="text-slate-600 mt-1">
            Manage leave allowances for all employees by category
          </p>
        </div>
        <Button
          className="btn-primary flex items-center gap-2"
          onClick={openNewDialog}
          data-testid="add-credit-btn"
        >
          <Plus size={20} />
          Assign Credits
        </Button>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categories.map(cat => {
          const Icon = categoryIcons[cat.id] || Briefcase;
          const colorClass = categoryColors[cat.id] || "bg-slate-100 text-slate-700";
          return (
            <div 
              key={cat.id} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClass} text-sm cursor-pointer ${selectedCategory === cat.id ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
            >
              <Icon size={14} />
              <span>{cat.name}</span>
            </div>
          );
        })}
        {selectedCategory !== "all" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedCategory("all")}
            className="text-xs"
          >
            Clear filter
          </Button>
        )}
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
            data-testid="credit-search-input"
          />
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32" data-testid="year-filter">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Credits by User */}
      {Object.keys(groupedByUser).length === 0 ? (
        <Card className="bento-card">
          <CardContent className="p-0">
            <div className="empty-state py-12">
              <CreditCard className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No credits found</p>
              <p className="text-sm text-slate-500 mt-1">
                Assign holiday credits to employees
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedByUser).map((userData, idx) => (
            <Card 
              key={userData.user_id} 
              className="bento-card animate-slide-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-slate-600">
                        {userData.user_name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{userData.user_name}</p>
                      <p className="text-sm text-slate-500">{userData.user_email}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {categories.map(cat => {
                    const credit = userData.credits.find(c => c.category === cat.id);
                    const Icon = categoryIcons[cat.id] || Briefcase;
                    const colorClass = categoryColors[cat.id] || "bg-slate-100 text-slate-700";
                    const percentage = credit && credit.total_days > 0 
                      ? (credit.remaining_days / credit.total_days) * 100 
                      : 0;
                    const expiringSoon = credit?.expires_at && isExpiringSoon(credit.expires_at);
                    const expired = credit?.expires_at && isExpired(credit.expires_at);
                    
                    return (
                      <div 
                        key={cat.id} 
                        className={`p-3 rounded-lg border ${credit ? '' : 'border-dashed opacity-60'} ${expired ? 'border-red-300 bg-red-50' : expiringSoon ? 'border-amber-300 bg-amber-50' : ''} hover:shadow-sm transition-shadow`}
                        data-testid={`credit-card-${userData.user_id}-${cat.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${colorClass}`}>
                              <Icon size={14} />
                            </div>
                            <span className="text-xs font-medium text-slate-600 truncate">{cat.name}</span>
                          </div>
                          {(expiringSoon || expired) && (
                            <AlertTriangle size={14} className={expired ? "text-red-500" : "text-amber-500"} />
                          )}
                        </div>
                        {credit ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-lg font-bold ${expired ? 'text-red-600' : 'text-slate-900'}`}>{credit.remaining_days}</span>
                              <span className="text-xs text-slate-500">/ {credit.total_days}</span>
                            </div>
                            <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percentage > 50 ? "bg-emerald-500" :
                                  percentage > 20 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Used: {credit.used_days}</p>
                            
                            {/* Expiration date display */}
                            {credit.expires_at && (
                              <div className={`text-xs mt-1 flex items-center gap-1 ${expired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                                <CalendarDays size={10} />
                                <span>
                                  {expired ? 'Expired: ' : 'Expires: '}
                                  {credit.expires_at}
                                </span>
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => openEditDialog(credit)}
                                data-testid={`edit-credit-${credit.credit_id}`}
                              >
                                <Edit size={12} className="mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => openAdjustDialog(credit)}
                                data-testid={`adjust-credit-${credit.credit_id}`}
                              >
                                <Minus size={12} className="mr-1" />
                                Adjust
                              </Button>
                            </div>
                            {/* Expiration button - not for paid_holiday */}
                            {cat.id !== "paid_holiday" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs mt-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => openExpirationDialog(credit)}
                                data-testid={`expiration-credit-${credit.credit_id}`}
                              >
                                <CalendarDays size={12} className="mr-1" />
                                Set Expiration
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2 text-xs"
                            onClick={() => {
                              setFormUser(userData.user_id);
                              setFormCategory(cat.id);
                              setTotalDays(cat.id === "paid_holiday" ? "35" : "10");
                              setFormYear(selectedYear);
                              setExpiresAt(null);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Plus size={12} className="mr-1" />
                            Assign
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Paid Holidays credits expire on July 31st of the following year (fixed). 
          For other categories, HR can set custom expiration dates.
        </p>
      </div>

      {/* Assign/Edit Credits Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCredit ? "Edit Credits" : "Assign Credits"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="form-label">Employee</Label>
              <Select
                value={formUser}
                onValueChange={setFormUser}
                disabled={!!editingCredit}
              >
                <SelectTrigger data-testid="user-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Leave Category</Label>
              <Select 
                value={formCategory} 
                onValueChange={setFormCategory}
                disabled={!!editingCredit}
              >
                <SelectTrigger data-testid="category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => {
                    const Icon = categoryIcons[cat.id] || Briefcase;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Year</Label>
              <Select value={formYear} onValueChange={setFormYear} disabled={!!editingCredit}>
                <SelectTrigger data-testid="year-select">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="form-label">Total Days</Label>
              <Input
                type="number"
                value={totalDays}
                onChange={(e) => setTotalDays(e.target.value)}
                min="0"
                max="365"
                step="0.5"
                data-testid="total-days-input"
              />
            </div>

            {/* Expiration date - not for paid_holiday */}
            {formCategory !== "paid_holiday" && (
              <div>
                <Label className="form-label">Expiration Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="expires-at-btn"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, "PPP") : "No expiration set"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {expiresAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs text-slate-500"
                    onClick={() => setExpiresAt(null)}
                  >
                    Clear expiration
                  </Button>
                )}
              </div>
            )}

            {formCategory === "paid_holiday" && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                Paid Holidays automatically expire on July 31, {parseInt(formYear) + 1}
              </p>
            )}

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                data-testid="save-credit-btn"
              >
                {saving ? "Saving..." : "Save Credits"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Credits Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={closeAdjustDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
          </DialogHeader>
          {adjustingCredit && (
            <div className="space-y-4 mt-4">
              {/* Credit Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const Icon = categoryIcons[adjustingCredit.category] || Briefcase;
                    const colorClass = categoryColors[adjustingCredit.category] || "bg-slate-100 text-slate-700";
                    return (
                      <div className={`p-2 rounded ${colorClass}`}>
                        <Icon size={18} />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-medium text-slate-900">{adjustingCredit.user_name}</p>
                    <p className="text-sm text-slate-600">{adjustingCredit.category_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-lg font-bold text-slate-900">{adjustingCredit.total_days}</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-xs text-slate-500">Used</p>
                    <p className="text-lg font-bold text-amber-600">{adjustingCredit.used_days}</p>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <p className="text-xs text-slate-500">Remaining</p>
                    <p className="text-lg font-bold text-emerald-600">{adjustingCredit.remaining_days}</p>
                  </div>
                </div>
              </div>

              {/* Adjustment Type */}
              <div>
                <Label className="form-label">Action</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={adjustmentType === "reduce" ? "default" : "outline"}
                    className={`flex-1 ${adjustmentType === "reduce" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={() => setAdjustmentType("reduce")}
                    data-testid="reduce-type-btn"
                  >
                    <Minus size={16} className="mr-2" />
                    Reduce
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentType === "add" ? "default" : "outline"}
                    className={`flex-1 ${adjustmentType === "add" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    onClick={() => setAdjustmentType("add")}
                    data-testid="add-type-btn"
                  >
                    <PlusCircle size={16} className="mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label className="form-label">Days to {adjustmentType === "reduce" ? "Reduce" : "Add"}</Label>
                <Input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  min="0.5"
                  max={adjustmentType === "reduce" ? adjustingCredit.remaining_days : 365}
                  step="0.5"
                  placeholder="Enter number of days"
                  data-testid="adjustment-amount-input"
                />
                {adjustmentType === "reduce" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum: {adjustingCredit.remaining_days} days
                  </p>
                )}
              </div>

              {/* Preview */}
              {adjustmentAmount && parseFloat(adjustmentAmount) > 0 && (
                <div className={`p-3 rounded-lg ${adjustmentType === "reduce" ? "bg-red-50 border border-red-200" : "bg-emerald-50 border border-emerald-200"}`}>
                  <p className={`text-sm font-medium ${adjustmentType === "reduce" ? "text-red-700" : "text-emerald-700"}`}>
                    After adjustment:
                  </p>
                  <p className={`text-lg font-bold ${adjustmentType === "reduce" ? "text-red-800" : "text-emerald-800"}`}>
                    {adjustmentType === "reduce" 
                      ? adjustingCredit.remaining_days - parseFloat(adjustmentAmount)
                      : adjustingCredit.remaining_days + parseFloat(adjustmentAmount)
                    } days remaining
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <Label className="form-label">Reason (optional)</Label>
                <Textarea
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Enter reason for adjustment..."
                  data-testid="adjustment-reason-input"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={closeAdjustDialog}
                >
                  Cancel
                </Button>
                <Button
                  className={adjustmentType === "reduce" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  onClick={handleAdjust}
                  disabled={adjusting || !adjustmentAmount || parseFloat(adjustmentAmount) <= 0}
                  data-testid="confirm-adjust-btn"
                >
                  {adjusting ? "Adjusting..." : `${adjustmentType === "reduce" ? "Reduce" : "Add"} Credits`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Set Expiration Dialog */}
      <Dialog open={isExpirationDialogOpen} onOpenChange={closeExpirationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Expiration Date</DialogTitle>
          </DialogHeader>
          {expirationCredit && (
            <div className="space-y-4 mt-4">
              {/* Credit Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = categoryIcons[expirationCredit.category] || Briefcase;
                    const colorClass = categoryColors[expirationCredit.category] || "bg-slate-100 text-slate-700";
                    return (
                      <div className={`p-2 rounded ${colorClass}`}>
                        <Icon size={18} />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-medium text-slate-900">{expirationCredit.user_name}</p>
                    <p className="text-sm text-slate-600">{expirationCredit.category_name} - {expirationCredit.year}</p>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <span className="text-slate-500">Current balance: </span>
                  <span className="font-medium">{expirationCredit.remaining_days} / {expirationCredit.total_days} days</span>
                </div>
                {expirationCredit.expires_at && (
                  <div className="mt-1 text-sm">
                    <span className="text-slate-500">Current expiration: </span>
                    <span className="font-medium">{expirationCredit.expires_at}</span>
                  </div>
                )}
              </div>

              {/* Date picker */}
              <div>
                <Label className="form-label">New Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="new-expiration-date-btn"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newExpirationDate ? format(newExpirationDate, "PPP") : "Select expiration date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newExpirationDate}
                      onSelect={setNewExpirationDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {newExpirationDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs text-slate-500"
                    onClick={() => setNewExpirationDate(null)}
                  >
                    Clear expiration (no limit)
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Setting an expiration date will notify the employee. Credits should be used before this date.
              </p>

              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={closeExpirationDialog}
                >
                  Cancel
                </Button>
                <Button
                  className="btn-primary"
                  onClick={handleUpdateExpiration}
                  disabled={savingExpiration}
                  data-testid="save-expiration-btn"
                >
                  {savingExpiration ? "Saving..." : "Update Expiration"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRCredits;
