import React, { useContext, useState, useEffect } from "react";
import { AuthContext, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Star,
  Briefcase,
  Heart,
  Baby,
  Thermometer,
  DollarOff
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek
} from "date-fns";

// Category icons and colors
const categoryIcons = {
  paid_holiday: Briefcase,
  unpaid_leave: DollarOff,
  sick_leave: Thermometer,
  parental_leave: Heart,
  maternity_leave: Baby
};

const categoryColors = {
  paid_holiday: "bg-blue-200 text-blue-800",
  unpaid_leave: "bg-slate-200 text-slate-800",
  sick_leave: "bg-red-200 text-red-800",
  parental_leave: "bg-purple-200 text-purple-800",
  maternity_leave: "bg-pink-200 text-pink-800"
};

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const [eventsRes, holidaysRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/calendar/events?year=${year}&month=${month}`),
        axios.get(`${API}/public-holidays?year=${year}`),
        axios.get(`${API}/categories`)
      ]);
      
      setEvents(eventsRes.data);
      setPublicHolidays(holidaysRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getEventsForDay = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter(e => {
      const start = e.start;
      const end = e.end;
      return dateStr >= start && dateStr <= end;
    });
  };

  const isPublicHoliday = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return publicHolidays.find(h => h.date === dateStr);
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  return (
    <div className="p-6 md:p-8 lg:p-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Team Calendar
          </h1>
          <p className="text-slate-600 mt-1">
            View approved holidays and public holidays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            data-testid="prev-month-btn"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="outline"
            onClick={today}
            className="px-4"
            data-testid="today-btn"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            data-testid="next-month-btn"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Month Title */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {format(currentDate, "MMMM yyyy")}
        </h2>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {categories.map(cat => {
          const colorClass = categoryColors[cat.id] || "bg-slate-200";
          return (
            <div key={cat.id} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${colorClass.split(' ')[0]}`} />
              <span className="text-sm text-slate-600">{cat.name}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-200 rounded" />
          <span className="text-sm text-slate-600">Public Holiday</span>
        </div>
      </div>

      {/* Calendar */}
      <Card className="bento-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="w-8 h-8 spinner" />
            </div>
          ) : (
            <div className="calendar-grid">
              {/* Header */}
              {weekDays.map((day) => (
                <div key={day} className="calendar-header">
                  {day}
                </div>
              ))}

              {/* Days */}
              {days.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const dayEvents = getEventsForDay(day);
                const publicHoliday = isPublicHoliday(day);

                return (
                  <div
                    key={idx}
                    className={`calendar-cell ${
                      isToday ? "calendar-cell-today" : ""
                    } ${!isCurrentMonth ? "calendar-cell-other-month" : ""}`}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? "inline-flex items-center justify-center w-7 h-7 bg-blue-500 text-white rounded-full"
                          : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Public Holiday */}
                    {publicHoliday && (
                      <div className="calendar-event calendar-event-public" title={publicHoliday.name}>
                        <Star size={10} className="inline mr-1" />
                        {publicHoliday.name}
                      </div>
                    )}

                    {/* Employee Holidays - with category colors */}
                    {dayEvents
                      .filter(e => e.type === "holiday")
                      .slice(0, 2)
                      .map((event, i) => {
                        const colorClass = categoryColors[event.category] || "bg-blue-200 text-blue-800";
                        const Icon = categoryIcons[event.category] || User;
                        return (
                          <div
                            key={i}
                            className={`calendar-event ${colorClass}`}
                            title={event.title}
                          >
                            <Icon size={10} className="inline mr-1" />
                            {event.user_name}
                          </div>
                        );
                      })}

                    {dayEvents.filter(e => e.type === "holiday").length > 2 && (
                      <div className="text-xs text-slate-500 mt-1">
                        +{dayEvents.filter(e => e.type === "holiday").length - 2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Holidays */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              Upcoming Team Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.filter(e => e.type === "holiday" && e.start >= format(new Date(), "yyyy-MM-dd")).length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming holidays this month</p>
            ) : (
              <div className="space-y-3">
                {events
                  .filter(e => e.type === "holiday" && e.start >= format(new Date(), "yyyy-MM-dd"))
                  .slice(0, 5)
                  .map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{event.user_name}</p>
                        <p className="text-sm text-slate-600">
                          {event.start} → {event.end}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Holidays */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star size={20} className="text-emerald-500" />
              Public Holidays ({currentDate.getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publicHolidays.length === 0 ? (
              <p className="text-sm text-slate-500">No public holidays set for this year</p>
            ) : (
              <div className="space-y-3">
                {publicHolidays.slice(0, 5).map((holiday, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{holiday.name}</p>
                      <p className="text-sm text-slate-600">{holiday.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Calendar;
