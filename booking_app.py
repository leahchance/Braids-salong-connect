"""
Booking application for African braids and barber services
This application contains intentional bugs for demonstration purposes
"""

import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Optional


class BookingSystem:
    def __init__(self, db_path: str = "bookings.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                service_type TEXT NOT NULL,
                city TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                booking_time TEXT NOT NULL,
                price REAL NOT NULL,
                status TEXT DEFAULT 'pending'
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                base_price REAL NOT NULL
            )
        """)
        
        conn.commit()
        conn.close()
    
    def search_bookings(self, city: str):
        """
        Search for bookings by city
        FIXED: Uses parameterized query to prevent SQL injection
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # FIXED: Parameterized query using ? placeholder
        # This ensures user input is properly escaped and treated as data, not code
        cursor.execute(
            "SELECT * FROM bookings WHERE city = ?",
            (city,)
        )
        results = cursor.fetchall()
        
        conn.close()
        return results
    
    def get_available_slots(self, date: str, city: str) -> List[str]:
        """
        Get available time slots for a given date and city
        FIXED: Now uses proper datetime comparison instead of string comparison
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT booking_time FROM bookings WHERE booking_date = ? AND city = ?",
            (date, city)
        )
        booked_times = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Parse the input date and current datetime properly
        try:
            input_date = datetime.strptime(date, "%Y-%m-%d").date()
            current_datetime = datetime.now()
            current_date = current_datetime.date()
        except ValueError:
            return []  # Invalid date format
        
        # Generate time slots from 9 AM to 6 PM
        available_slots = []
        for hour in range(9, 18):
            time_slot = f"{hour:02d}:00"
            
            # FIXED: Proper datetime comparison
            # Only filter out past times if the date is today
            if input_date == current_date:
                slot_datetime = datetime.strptime(f"{date} {time_slot}", "%Y-%m-%d %H:%M")
                if slot_datetime <= current_datetime:
                    continue
            elif input_date < current_date:
                # Don't show any slots for past dates
                continue
            
            if time_slot not in booked_times:
                available_slots.append(time_slot)
        
        return available_slots
    
    def calculate_total_revenue(self, start_date: str, end_date: str, city: str) -> float:
        """
        Calculate total revenue for a date range and city
        FIXED: Uses a single efficient query with SUM aggregate instead of N+1 queries
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # FIXED: Single query with SUM aggregate function
        # This is O(1) query complexity instead of O(N) where N is number of bookings
        cursor.execute(
            """
            SELECT COALESCE(SUM(price), 0.0)
            FROM bookings 
            WHERE booking_date >= ? AND booking_date <= ? AND city = ?
            """,
            (start_date, end_date, city)
        )
        
        result = cursor.fetchone()
        total_revenue = result[0] if result else 0.0
        
        conn.close()
        return total_revenue
    
    def create_booking(self, customer_name: str, service_type: str, 
                      city: str, booking_date: str, booking_time: str, 
                      price: float) -> int:
        """Create a new booking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO bookings (customer_name, service_type, city, booking_date, booking_time, price)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (customer_name, service_type, city, booking_date, booking_time, price))
        
        booking_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return booking_id
    
    def get_booking_stats(self, city: str) -> Dict[str, int]:
        """Get statistics about bookings"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT service_type, COUNT(*) FROM bookings WHERE city = ? GROUP BY service_type",
            (city,)
        )
        
        stats = {}
        for row in cursor.fetchall():
            stats[row[0]] = row[1]
        
        conn.close()
        return stats


def demo_usage():
    """Demonstrate the booking system with bugs"""
    booking_system = BookingSystem()
    
    # Create some test bookings
    print("Creating test bookings...")
    booking_system.create_booking("John Doe", "African Braids", "Stockholm", "2025-10-30", "10:00", 500.0)
    booking_system.create_booking("Jane Smith", "Barber Service", "Stockholm", "2025-10-30", "11:00", 300.0)
    booking_system.create_booking("Alice Johnson", "African Braids", "Gothenburg", "2025-10-31", "14:00", 550.0)
    
    print("\n=== Demonstrating Bug #3 (SQL Injection) ===")
    # This search is vulnerable to SQL injection
    city_input = "Stockholm"
    results = booking_system.search_bookings(city_input)
    print(f"Bookings in {city_input}: {len(results)} found")
    
    # Malicious input could be: "Stockholm' OR '1'='1"
    # This would return ALL bookings, not just Stockholm ones
    
    print("\n=== Demonstrating Bug #1 (Logic Error) ===")
    today = datetime.now().strftime("%Y-%m-%d")
    slots = booking_system.get_available_slots(today, "Stockholm")
    print(f"Available slots for today: {slots}")
    # The time comparison logic is flawed and may show past time slots
    
    print("\n=== Demonstrating Bug #2 (Performance Issue) ===")
    revenue = booking_system.calculate_total_revenue("2025-10-01", "2025-10-31", "Stockholm")
    print(f"Total revenue for October in Stockholm: {revenue} SEK")
    # This makes N+1 queries - very inefficient for large datasets


if __name__ == "__main__":
    demo_usage()
