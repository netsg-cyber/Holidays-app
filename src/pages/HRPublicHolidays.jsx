import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  CalendarCheck,
  Plus,
  Trash2,
  Star
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
import { Label } from "../components/ui/label";
import { Calendar as CalendarPicker } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

const HRPublicHolidays = () => {
  const { user } = useContext(AuthContext);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "hr") return;
    fetchHolidays();
  }, [user, selectedYear]);

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(`${API}/public-holidays?year=${selectedYear}`);
      setHolidays(response.data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast.error("Failed to load public holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!holidayName.trim() || !holidayDate) {
      toast.error("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/public-holidays`, {
        name: holidayName.trim(),
        date: format(holidayDate, "yyyy-MM-dd"),
        year: parseInt(selectedYear)
      });
      toast.success("Public holiday created successfully");
      setIsDialogOpen(false);
      setHolidayName("");
      setHolidayDate(null);
      fetchHolidays();
    } catch (error) {
      console.error("Error creating holiday:", error);
      toast.error(error.response?.data?.detail || "Failed to create holiday");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holidayId) => {
    try {
      await axios.delete(`${API}/public-holidays/${holidayId}`);
      toast.success("Public holiday deleted");
      fetchHolidays();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("Failed to delete holiday");
    }
  };

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
            Public Holidays
          </h1>
          <p className="text-slate-600 mt-1">
            Manage public holidays for the organization
          </p>
        </div>
        <Button
          className="btn-primary flex items-center gap-2"
          onClick={() => setIsDialogOpen(true)}
          data-testid="add-holiday-btn"
        >
          <Plus size={20} />
          Add Holiday
        </Button>
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32" data-testid="holiday-year-filter">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500">
          {holidays.length} public holiday(s) in {selectedYear}
        </p>
      </div>

      {/* Holidays List */}
      <Card className="bento-card">
        <CardContent className="p-0">
          {holidays.length === 0 ? (
            <div className="empty-state py-12">
              <CalendarCheck className="empty-state-icon" />
              <p className="text-slate-600 font-medium">No public holidays</p>
              <p className="text-sm text-slate-500 mt-1">
                Add public holidays for {selectedYear}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {holidays.map((holiday, idx) => (
                <div
                  key={holiday.holiday_id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  data-testid={`holiday-row-${holiday.holiday_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Star className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{holiday.name}</p>
                      <p className="text-sm text-slate-500 mono">{holiday.date}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-holiday-btn-${holiday.holiday_id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Public Holiday</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{holiday.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(holiday.holiday_id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Public Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="form-label">Holiday Name</Label>
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="e.g., Christmas Day"
                data-testid="holiday-name-input"
              />
            </div>

            <div>
              <Label className="form-label">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="holiday-date-btn"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {holidayDate ? format(holidayDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={holidayDate}
                    onSelect={setHolidayDate}
                    defaultMonth={new Date(parseInt(selectedYear), 0, 1)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                onClick={handleCreate}
                disabled={saving}
                data-testid="save-holiday-btn"
              >
                {saving ? "Saving..." : "Add Holiday"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRPublicHolidays;
