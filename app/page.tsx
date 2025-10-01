import Link from 'next/link';
import Image from 'next/image';
import { Package, Users, Shield, Clock, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-500 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Storage System</h1>
            </div>
            <Link
              href="/auth/signin"
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Manage Your <span className="text-primary-500">Temporary Storage</span> Efficiently
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-gray-500">
              A comprehensive system for managing item borrowing with role-based access control, 
              approval workflows, and tracking capabilities.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/auth/signin"
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Key Features
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Our storage management system provides everything you need to efficiently track and manage borrowed items.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Item Management</h3>
              <p className="text-gray-500">
                Admins can easily add, remove, and track inventory items with detailed information and availability status.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Role-Based Access</h3>
              <p className="text-gray-500">
                Three-tier role system (Admin, Manager, User) ensures proper access control and responsibilities.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Approval Workflow</h3>
              <p className="text-gray-500">
                Dual approval system requires both manager and admin authorization for item borrowing requests.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Time-Limited Borrowing</h3>
              <p className="text-gray-500">
                Items can be borrowed for a maximum of 14 days with automatic tracking of due dates and returns.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Availability Tracking</h3>
              <p className="text-gray-500">
                Real-time inventory tracking shows which items are available, borrowed, or out of stock.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
              <p className="text-gray-500">
                Admins can manage user accounts, assign roles, and monitor user activity within the system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to streamline your storage management?
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Sign in now to access your dashboard and start managing items efficiently.
          </p>
          <div className="mt-8">
            <Link
              href="/auth/signin"
              className="bg-white text-primary-500 hover:bg-gray-100 font-medium py-3 px-6 rounded-md transition-colors inline-flex items-center"
            >
              Sign In to Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Package className="h-8 w-8 text-primary-500 mr-2" />
              <h1 className="text-xl font-bold">Storage System</h1>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Storage Management System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}