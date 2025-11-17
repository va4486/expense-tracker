'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import TransactionHistory from './components/TransactionHistory';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Home() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPin, setIsForgotPin] = useState(false);
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPin, setNewPin] = useState('');
    const [user, setUser] = useState<any>(null);

    // Expense data
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [description, setDescription] = useState('');
    const [dailyLimit, setDailyLimit] = useState('');
    const [budgetInfo, setBudgetInfo] = useState<any>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [viewPeriod, setViewPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [message, setMessage] = useState('');
    const [transactionHistoryKey, setTransactionHistoryKey] = useState(0);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchCategories();
            fetchExpenses(viewPeriod); // Fetch expenses for the Transaction History based on selected period
            fetchExpenses(); // Fetch today's expenses for the "Today's Expenses" section
            fetchBudget();
            fetchStats(); // This will use the current viewPeriod for charts
        }
    }, [isLoggedIn, viewPeriod]);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/expenses', {
                credentials: 'include'
            });
            if (res.ok) {
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.log('Not authenticated');
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        try {
            const body = isRegistering
                ? { username, pin, securityAnswer }
                : { username, pin };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                if (isRegistering) {
                    setMessage('Registration successful! Please login.');
                    setIsRegistering(false);
                    setSecurityAnswer('');
                } else {
                    setUser(data.user);
                    setMessage('');
                    // Reload page to ensure cookie is properly recognized
                    window.location.href = '/';
                }
                setPin('');
            } else {
                setMessage(data.error || 'Authentication failed');
            }
        } catch (error) {
            setMessage('An error occurred');
        }
    };

    const handleResetPin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/auth/reset-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, securityAnswer, newPin }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('PIN reset successful! Please login with your new PIN.');
                setIsForgotPin(false);
                setUsername('');
                setSecurityAnswer('');
                setNewPin('');
            } else {
                setMessage(data.error || 'PIN reset failed');
            }
        } catch (error) {
            setMessage('An error occurred');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setIsLoggedIn(false);
        setUser(null);
        setUsername('');
    };

    const fetchCategories = async () => {
        const res = await fetch('/api/categories', {
            credentials: 'include'
        });
        const data = await res.json();
        setCategories(data.categories || []);
    };

    const fetchExpenses = async (period?: 'week' | 'month' | 'year' | 'all') => {
        let url = '/api/expenses';
        if (period && period !== 'all') {
            url += `?period=${period}`;
        } else if (period === 'all') {
            // For 'all', no period or date params are needed, API handles it
        } else {
            // Default to today's expenses if no period is specified
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day
            const todayString = today.toISOString().split('T')[0];
            url += `?startDate=${todayString}&endDate=${todayString}`;
        }

        const res = await fetch(url, {
            credentials: 'include'
        });
        const data = await res.json();
        setExpenses(data.expenses || []);
    };

    // fetchTodaysExpenses is no longer needed as fetchExpenses handles the default case

    const fetchBudget = async () => {
        const res = await fetch('/api/budget', {
            credentials: 'include'
        });
        const data = await res.json();
        setBudgetInfo(data);
    };

    const fetchStats = async () => {
        const endDate = new Date().toISOString().split('T')[0];
        let startDate = new Date();

        if (viewPeriod === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (viewPeriod === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const groupBy = viewPeriod === 'week' ? 'day' : viewPeriod === 'month' ? 'week' : 'month';

        const res = await fetch(
            `/api/expenses/stats?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate}&groupBy=${groupBy}`,
            { credentials: 'include' }
        );
        const data = await res.json();
        setStats(data.stats || []);
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    categoryId: parseInt(selectedCategory),
                    description,
                }),
                credentials: 'include'
            });

            if (res.ok) {
                setAmount('');
                setDescription('');
                setMessage('Expense added successfully!');
                fetchExpenses(); // Refresh "Today's Expenses" with default (today's)
                fetchExpenses(viewPeriod); // Refresh Transaction History with current period
                fetchBudget();
                fetchStats(); // This will use the current viewPeriod for charts
                setTransactionHistoryKey(prevKey => prevKey + 1); // Refresh Transaction History
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('Failed to add expense');
        }
    };

    const handleSetDailyLimit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limitAmount: parseFloat(dailyLimit) }),
                credentials: 'include'
            });

            if (res.ok) {
                setMessage('Daily limit set successfully!');
                fetchBudget();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('Failed to set daily limit');
        }
    };

    const handleAddCategory = async () => {
        const name = prompt('Enter category name:');
        const type = prompt('Enter type (essential/non-essential):');

        if (name && type) {
            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, type }),
                    credentials: 'include'
                });

                if (res.ok) {
                    fetchCategories();
                    setMessage('Category added successfully!');
                    setTimeout(() => setMessage(''), 3000);
                }
            } catch (error) {
                setMessage('Failed to add category');
            }
        }
    };

    // Process stats for charts
    const chartData = stats.reduce((acc: any[], curr: any) => {
        const existing = acc.find(item => item.period === curr.period);
        if (existing) {
            existing[curr.category_type] = (existing[curr.category_type] || 0) + curr.total_amount;
        } else {
            acc.push({
                period: curr.period,
                [curr.category_type]: curr.total_amount,
            });
        }
        return acc;
    }, []);

    const categoryTotals = stats.reduce((acc: any[], curr: any) => {
        const existing = acc.find(item => item.name === curr.category_name);
        if (existing) {
            existing.value += curr.total_amount;
        } else {
            acc.push({
                name: curr.category_name,
                value: curr.total_amount,
            });
        }
        return acc;
    }, []);

    if (!isLoggedIn) {
        if (isForgotPin) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                        <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
                            Reset PIN
                        </h1>

                        <form onSubmit={handleResetPin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Security Question: What is the name of your first pet?
                                </label>
                                <input
                                    type="text"
                                    value={securityAnswer}
                                    onChange={(e) => setSecurityAnswer(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter your answer"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    New 6-Digit PIN
                                </label>
                                <input
                                    type="password"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter new 6-digit PIN"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            {message && (
                                <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                            >
                                Reset PIN
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPin(false);
                                    setMessage('');
                                    setUsername('');
                                    setSecurityAnswer('');
                                    setNewPin('');
                                }}
                                className="w-full text-indigo-600 hover:text-indigo-700 text-sm"
                            >
                                Back to Login
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
                        Expense Tracker
                    </h1>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                6-Digit PIN
                            </label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Enter 6-digit PIN"
                                maxLength={6}
                                required
                            />
                        </div>

                        {isRegistering && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Security Question: What is the name of your first pet?
                                </label>
                                <input
                                    type="text"
                                    value={securityAnswer}
                                    onChange={(e) => setSecurityAnswer(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Enter your answer"
                                    required={isRegistering}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    This will be used to reset your PIN if you forget it
                                </p>
                            </div>
                        )}

                        {message && (
                            <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                        >
                            {isRegistering ? 'Register' : 'Login'}
                        </button>

                        {!isRegistering && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotPin(true);
                                    setMessage('');
                                }}
                                className="w-full text-indigo-600 hover:text-indigo-700 text-sm"
                            >
                                Forgot PIN?
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setMessage('');
                                setSecurityAnswer('');
                            }}
                            className="w-full text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                            {isRegistering ? 'Already have an account? Login' : 'New user? Register'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600">Expense Tracker</h1>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>

                {message && (
                    <div className={`p-3 rounded mb-4 ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* Budget Alert */}
                {budgetInfo && budgetInfo.dailyLimit !== undefined && (
                    <div className={`rounded-lg shadow p-6 mb-4 ${budgetInfo.remaining < 0 ? 'bg-red-50 border-2 border-red-300' :
                        budgetInfo.percentUsed > 80 ? 'bg-yellow-50 border-2 border-yellow-300' :
                            'bg-green-50 border-2 border-green-300'
                        }`}>
                        <h2 className="text-xl font-bold mb-2">Daily Budget Status</h2>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-sm text-gray-600">Daily Limit</p>
                                <p className="text-2xl font-bold">₹{(budgetInfo.dailyLimit || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Spent Today</p>
                                <p className="text-2xl font-bold">₹{(budgetInfo.totalSpent || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Remaining</p>
                                <p className={`text-2xl font-bold ${budgetInfo.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{(budgetInfo.remaining || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        {budgetInfo.remaining < 0 && (
                            <p className="text-red-600 font-bold mt-2 text-center">⚠️ You've exceeded your daily limit!</p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* Add Expense Form */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                >
                                    <option value="">Select category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.parent_id ? '  └─ ' : ''}{cat.name} ({cat.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded"
                                />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                                Add Expense
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={handleAddCategory}
                            className="w-full mt-2 bg-green-600 text-white py-2 rounded hover:bg-green-700"
                        >
                            Add New Category
                        </button>
                    </div>

                    {/* Set Daily Limit */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Set Daily Limit</h2>
                        <form onSubmit={handleSetDailyLimit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Daily Limit (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={dailyLimit}
                                    onChange={(e) => setDailyLimit(e.target.value)}
                                    className="w-full px-3 py-2 border rounded"
                                    placeholder="e.g., 500"
                                    required
                                />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
                                Set Limit
                            </button>
                        </form>

                        <div className="mt-6">
                            <h3 className="font-bold mb-2">Budget Tip</h3>
                            <p className="text-sm text-gray-600">
                                For a salary under ₹45,000, aim to keep daily expenses under ₹500-800
                                for better financial management.
                            </p>
                        </div>
                    </div>

                    {/* Today's Expenses */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Today's Expenses</h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {expenses.length === 0 ? (
                                <p className="text-gray-500">No expenses recorded today</p>
                            ) : (
                                expenses.map((exp) => (
                                    <div key={exp.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">₹{exp.amount.toFixed(2)}</p>
                                                <p className="text-sm text-gray-600">{exp.category_name}</p>
                                                {exp.description && <p className="text-xs text-gray-500">{exp.description}</p>}
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {new Date(exp.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="mt-4">
                    <TransactionHistory updateTrigger={transactionHistoryKey} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Expense Trend Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Expense Trend</h2>
                            <select
                                value={viewPeriod}
                                onChange={(e) => setViewPeriod(e.target.value as any)}
                                className="px-3 py-1 border rounded"
                            >
                                <option value="week">Last Week</option>
                                <option value="month">Last Month</option>
                                <option value="year">Last Year</option>
                            </select>
                        </div>

                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="essential" fill="#10b981" name="Essential" />
                                <Bar dataKey="non-essential" fill="#f59e0b" name="Non-Essential" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Category Distribution</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryTotals}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryTotals.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
