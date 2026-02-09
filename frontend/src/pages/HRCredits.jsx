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
  MinusCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

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

const HRCredits = () => {
  const { user } = useContext(AuthContext);
  const [credits, setCredits] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  
  // Form state
  const [formUser, setFormUser] = useState("");
  const [formCategory, setFormCategory] = useState("paid_holiday");
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [totalDays, setTotalDays] = useState("35");
  const [saving, setSaving] = useState(false);

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
        total_days: parseFloat(totalDays)
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

  const resetForm = () => {
    setFormUser("");
    setFormCategory("paid_holiday");
    setFormYear(new Date().getFullYear().toString());
    setTotalDays("35");
    setEditingCredit(null);
  };

  const openEditDialog = (credit) => {
    setEditingCredit(credit);
    setFormUser(credit.user_id);
    setFormCategory(credit.category || "paid_holiday");
    setFormYear(credit.year.toString());
    setTotalDays(credit.total_days.toString());
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {categories.map(cat => {
                    const credit = userData.credits.find(c => c.category === cat.id);
                    const Icon = categoryIcons[cat.id] || Briefcase;
                    const colorClass = categoryColors[cat.id] || "bg-slate-100 text-slate-700";
                    const percentage = credit && credit.total_days > 0 
                      ? (credit.remaining_days / credit.total_days) * 100 
                      : 0;
                    
                    return (
                      <div 
                        key={cat.id} 
                        className={`p-3 rounded-lg border ${credit ? '' : 'border-dashed opacity-60'} hover:shadow-sm transition-shadow cursor-pointer`}
                        onClick={() => {
                          if (credit) {
                            openEditDialog(credit);
                          } else {
                            setFormUser(userData.user_id);
                            setFormCategory(cat.id);
                            setTotalDays(cat.id === "paid_holiday" ? "35" : "10");
                            setFormYear(selectedYear);
                            setIsDialogOpen(true);
                          }
                        }}
                        data-testid={`credit-card-${userData.user_id}-${cat.id}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded ${colorClass}`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-xs font-medium text-slate-600 truncate">{cat.name}</span>
                        </div>
                        {credit ? (
                          <>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-slate-900">{credit.remaining_days}</span>
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
                          </>
                        ) : (
                          <p className="text-xs text-slate-400">Click to assign</p>
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
          <strong>Note:</strong> Credits from year N-1 will be automatically deleted on July 31st of year N.
        </p>
      </div>

      {/* Add/Edit Dialog */}
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
    </div>
  );
};

export default HRCredits;
