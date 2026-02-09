import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  CreditCard,
  User,
  Plus,
  Search,
  Edit
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

const HRCredits = () => {
  const { user } = useContext(AuthContext);
  const [credits, setCredits] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState("");
  const [totalDays, setTotalDays] = useState("35");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "hr") return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [creditsRes, usersRes] = await Promise.all([
        axios.get(`${API}/credits/all`),
        axios.get(`${API}/users`)
      ]);
      setCredits(creditsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser || !totalDays) {
      toast.error("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/credits`, {
        user_id: selectedUser,
        year: parseInt(selectedYear),
        total_days: parseFloat(totalDays)
      });
      toast.success("Credits updated successfully");
      setIsDialogOpen(false);
      setSelectedUser("");
      setTotalDays("35");
      setEditingCredit(null);
      fetchData();
    } catch (error) {
      console.error("Error saving credits:", error);
      toast.error(error.response?.data?.detail || "Failed to save credits");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (credit) => {
    setEditingCredit(credit);
    setSelectedUser(credit.user_id);
    setTotalDays(credit.total_days.toString());
    setSelectedYear(credit.year.toString());
    setIsDialogOpen(true);
  };

  const filteredCredits = credits.filter(c => {
    const matchesYear = c.year.toString() === selectedYear;
    const matchesSearch = search === "" || 
      c.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchesYear && matchesSearch;
  });

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
            Manage holiday allowances for all employees
          </p>
        </div>
        <Button
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingCredit(null);
            setSelectedUser("");
            setTotalDays("35");
            setIsDialogOpen(true);
          }}
          data-testid="add-credit-btn"
        >
          <Plus size={20} />
          Assign Credits
        </Button>
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

      {/* Credits Table */}
      <Card className="bento-card overflow-hidden">
        <CardContent className="p-0">
          {filteredCredits.length === 0 ? (
            <div className="empty-state py-12">
              <CreditCard className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No credits found</p>
              <p className="text-sm text-slate-500 mt-1">
                Assign holiday credits to employees
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Year</th>
                    <th>Total Days</th>
                    <th>Used Days</th>
                    <th>Remaining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCredits.map((credit, idx) => (
                    <tr
                      key={credit.credit_id}
                      className="animate-slide-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                      data-testid={`credit-row-${credit.credit_id}`}
                    >
                      <td>
                        <div>
                          <p className="font-medium text-slate-900">{credit.user_name}</p>
                          <p className="text-sm text-slate-500">{credit.user_email}</p>
                        </div>
                      </td>
                      <td className="mono">{credit.year}</td>
                      <td className="font-medium">{credit.total_days}</td>
                      <td className="text-amber-600">{credit.used_days}</td>
                      <td>
                        <span className={`font-bold ${
                          credit.remaining_days <= 5 ? "text-red-600" :
                          credit.remaining_days <= 10 ? "text-amber-600" :
                          "text-emerald-600"
                        }`}>
                          {credit.remaining_days}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(credit)}
                          data-testid={`edit-credit-btn-${credit.credit_id}`}
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                value={selectedUser}
                onValueChange={setSelectedUser}
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
              <Label className="form-label">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!!editingCredit}>
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
