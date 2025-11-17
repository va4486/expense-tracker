'use client';

import { useState, useEffect } from 'react';

const TransactionHistory = ({ updateTrigger }: { updateTrigger: number }) => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [period, setPeriod] = useState('week');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchExpenses(period);
    }, [period, updateTrigger]);

    const fetchExpenses = async (selectedPeriod: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/expenses?period=${selectedPeriod}`, {
                credentials: 'include',
            });
            const data = await res.json();
            setExpenses(data.expenses || []);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    const groupedExpenses: { [key: string]: any[] } = expenses.reduce((acc, exp) => {
        const date = new Date(exp.timestamp).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(exp);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Transaction History</h2>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-3 py-1 border rounded"
                >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                    <p>Loading...</p>
                ) : expenses.length === 0 ? (
                    <p className="text-gray-500">No expenses recorded for this period</p>
                ) : (
                    Object.entries(groupedExpenses).map(([date, dailyExpenses]: [string, any[]]) => (
                        <div key={date}>
                            <h3 className="font-semibold text-gray-600 bg-gray-100 p-2 rounded my-2">
                                {new Date(dailyExpenses[0].timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            {dailyExpenses.map((exp: any) => (
                                <div key={exp.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50 ml-2">
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
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
