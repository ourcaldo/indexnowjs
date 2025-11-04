<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Import 'Inter' font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        /* Use Inter as the default font */
        body {
            font-family: 'Inter', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Custom styles for the toggle switch */
        .toggle-checkbox:checked {
            @apply: bg-gray-900;
            right: 0;
            border-color: #11182c; /* gray-900 */
        }
        .toggle-checkbox:checked + .toggle-label {
            @apply: bg-gray-900;
        }
        .toggle-checkbox:checked + .toggle-label .toggle-knob {
            @apply: translate-x-5;
        }
    </style>
</head>
<body class="bg-gray-50 text-gray-900">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <!-- Page Header -->
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
            <p class="mt-1 text-sm text-gray-500">Manage your account, services, and billing preferences.</p>
        </header>

        <!-- Tab Navigation -->
        <div class="mb-6">
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-6" aria-label="Tabs" role="tablist">
                    <!-- Account Tab -->
                    <button role="tab"
                            data-tab-target="account"
                            class="tab-button active-tab whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm text-gray-900 border-gray-900"
                            aria-selected="true">
                        Account
                    </button>
                    
                    <!-- Service Accounts Tab -->
                    <button role="tab"
                            data-tab-target="service-accounts"
                            class="tab-button inactive-tab whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                            aria-selected="false">
                        Service Accounts
                    </button>

                    <!-- Billings Tab -->
                    <button role="tab"
                            data-tab-target="billings"
                            class="tab-button inactive-tab whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                            aria-selected="false">
                        Billings
                    </button>
                </nav>
            </div>
        </div>

        <!-- Tab Content Panels -->
        <div>
            <!-- ====== Account Panel ====== -->
            <div id="account" role="tabpanel" class="space-y-8">
                
                <!-- Personal Information Card -->
                <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                    <div class="px-6 py-5">
                        <h2 class="text-lg font-semibold text-gray-900">Personal Information</h2>
                        <p class="mt-1 text-sm text-gray-500">Update your account details.</p>
                    </div>
                    <div class="border-t border-gray-200 px-6 py-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label for="full-name" class="block text-sm font-medium text-gray-700">Full name</label>
                                <input type="text" id="full-name" value="Aldo Dwi Kristian" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                                <input type="email" id="email" value="aldodkris@gmail.com" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label for="phone" class="block text-sm font-medium text-gray-700">Phone number</label>
                                <input type="tel" id="phone" placeholder="Optional - for account recovery" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 text-right rounded-b-xl">
                        <button class="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                            Save Changes
                        </button>
                    </div>
                </div>

                <!-- Security & Password Card -->
                <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                    <div class="px-6 py-5">
                        <h2 class="text-lg font-semibold text-gray-900">Security & Password</h2>
                        <p class="mt-1 text-sm text-gray-500">Keep your account secure.</p>
                    </div>
                    <div class="border-t border-gray-200 px-6 py-6">
                        <div class="max-w-md space-y-4">
                            <div>
                                <label for="current-password" class="block text-sm font-medium text-gray-700">Current password</label>
                                <input type="password" id="current-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                            <div>
                                <label for="new-password" class="block text-sm font-medium text-gray-700">New password</label>
                                <input type="password" id="new-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                            <div>
                                <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm new password</label>
                                <input type="password" id="confirm-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm">
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 text-right rounded-b-xl">
                        <button class="inline-flex justify-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                            Update Password
                        </button>
                    </div>
                </div>

                <!-- Email Notifications Card -->
                <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                    <div class="px-6 py-5">
                        <h2 class="text-lg font-semibold text-gray-900">Email Notifications</h2>
                        <p class="mt-1 text-sm text-gray-500">Choose what updates you want to receive.</p>
                    </div>
                    <ul class="divide-y divide-gray-200">
                        <li class="flex items-center justify-between px-6 py-4">
                            <div>
                                <h3 class="font-medium text-gray-800">Indexing updates</h3>
                                <p class="text-sm text-gray-500">Get notified when indexing jobs complete.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only toggle-checkbox" checked>
                                <div class="toggle-label w-11 h-6 bg-gray-200 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out">
                                    <div class="toggle-knob w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out"></div>
                                </div>
                            </label>
                        </li>
                        <li class="flex items-center justify-between px-6 py-4">
                            <div>
                                <h3 class="font-medium text-gray-800">Failure alerts</h3>
                                <p class="text-sm text-gray-500">Immediate notifications for failed jobs.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only toggle-checkbox">
                                <div class="toggle-label w-11 h-6 bg-gray-200 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out">
                                    <div class="toggle-knob w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out"></div>
                                </div>
                            </label>
                        </li>
                        <li class="flex items-center justify-between px-6 py-4">
                            <div>
                                <h3 class="font-medium text-gray-800">Daily summaries</h3>
                                <p class="text-sm text-gray-500">Digest of your account activity.</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only toggle-checkbox" checked>
                                <div class="toggle-label w-11 h-6 bg-gray-200 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out">
                                    <div class="toggle-knob w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out"></div>
                                </div>
                            </label>
                        </li>
                    </ul>
                </div>

            </div>

            <!-- ====== Service Accounts Panel ====== -->
            <div id="service-accounts" role="tabpanel" class="hidden space-y-6">
                <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-600">Manage Google service accounts for indexing.</p>
                    <button class="inline-flex items-center rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                        <!-- Plus Icon -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                        </svg>
                        New service account
                    </button>
                </div>

                <!-- Service Account List -->
                <div class="space-y-4">
                    <!-- Service Account Card 1 -->
                    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <h3 class="text-lg font-semibold text-gray-900">indexnow</h3>
                                <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                            </div>
                            <button class="text-gray-400 hover:text-red-600">
                                <!-- Trash Icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <p class="mt-1 text-sm text-gray-500">indexnow@nexpocket.iam.gserviceaccount.com</p>

                        <!-- Quota Usage Bar -->
                        <div class="mt-4">
                            <div class="flex justify-between text-sm font-medium text-gray-600">
                                <span>Daily Quota Usage</span>
                                <span>0 / 200</span>
                            </div>
                            <div class="mt-1 bg-gray-200 rounded-full h-2">
                                <span>Daily Quota Usage</span>
                                <span>0 / 200</span>
                            </div>
                            <div class="mt-1 bg-gray-200 rounded-full h-2">
                                <div class="bg-gray-900 h-2 rounded-full" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Service Account Card 2 -->
                    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <h3 class="text-lg font-semibold text-gray-900">indexnow-staging</h3>
                                <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                            </div>
                            <button class="text-gray-400 hover:text-red-600">
                                <!-- Trash Icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <p class="mt-1 text-sm text-gray-500">indexnow@setta-n8n.iam.gserviceaccount.com</p>

                        <!-- Quota Usage Bar -->
                        <div class="mt-4">
                            <div class="flex justify-between text-sm font-medium text-gray-600">
                                <span>Daily Quota Usage</span>
                                <span>50 / 200</span>
                            </div>
                            <div class="mt-1 bg-gray-200 rounded-full h-2">
                                <span>Daily Quota Usage</span>
                                <span>50 / 200</span>
                            </div>
                            <div class="mt-1 bg-gray-200 rounded-full h-2">
                                <div class="bg-gray-900 h-2 rounded-full" style="width: 25%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ====== Billings Panel ====== -->
            <div id="billings" role="tabpanel" class="hidden space-y-8">
                
                <!-- Current Plan Card -->
                <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                    <div class="px-6 py-5">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-900">Current Plan</h2>
                                <p class="mt-1 text-3xl font-bold text-gray-900">Pro</s_>
                                <p class="text-sm text-gray-500">$45.00 / mo — Next bill on Dec 3, 2025</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- New Usage Section -->
                    <div class="border-t border-gray-200 px-6 py-6">
                        <h3 class="text-base font-semibold text-gray-900 mb-4">Current Usage</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            <!-- Usage Metric 1: Daily URLs -->
                            <div>
                                <div class="flex justify-between text-sm font-medium text-gray-600">
                                    <span>Daily URLs</span>
                                    <span><span class="text-gray-900 font-bold">0</span> / 5,000</span>
                                </div>
                                <div class="mt-2 bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-gray-900 h-1.5 rounded-full" style="width: 0%"></div>
                                </div>
                            </div>

                            <!-- Usage Metric 2: Keywords -->
                            <div>
                                <div class="flex justify-between text-sm font-medium text-gray-600">
                                    <span>Keywords</span>
                                    <span><span class="text-gray-900 font-bold">1.5K</span> / 10K</span>
                                </div>
                                <div class="mt-2 bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-gray-900 h-1.5 rounded-full" style="width: 15%"></div>
                                </div>
                            </div>

                            <!-- Usage Metric 3: Service Accounts -->
                            <div>
                                <div class="flex justify-between text-sm font-medium text-gray-600">
                                    <span>Service Accounts</span>
                                    <span><span class="text-gray-900 font-bold">2</span> / 10</span>
                                </div>
                                <div class="mt-2 bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-gray-900 h-1.5 rounded-full" style="width: 20%"></div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Plans Section -->
                <div>
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Available Plans</h2>
                        <!-- Monthly/Yearly Toggle -->
                        <div class="flex items-center space-x-3">
                            <span class="text-sm font-medium text-gray-700">Monthly</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="sr-only toggle-checkbox">
                                <div class="toggle-label w-11 h-6 bg-gray-200 rounded-full border border-gray-200 transition-colors duration-200 ease-in-out">
                                    <div class="toggle-knob w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out"></div>
                                </div>
                            </label>
                            <span class="text-sm font-medium text-gray-700">Yearly</span>
                            <span class="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Save 20%</span>
                        </div>
                    </div>

                    <!-- Plans Grid -->
                    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <!-- Basic Plan -->
                        <div class="border border-gray-200 rounded-xl p-6 relative">
                            <h3 class="text-lg font-semibold text-gray-900">Basic</h3>
                            <p class="mt-2 text-4xl font-bold text-gray-900">$9.99<span class="text-xl font-medium text-gray-500">/mo</span></p>
                            <p class="mt-1 text-sm text-gray-500">Perfect for starting out.</p>
                            <button class="mt-6 w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                Downgrade
                            </button>
                        </div>

                        <!-- Premium Plan -->
                        <div class="border border-gray-200 rounded-xl p-6 relative">
                            <span class="absolute top-0 -translate-y-1/2 inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-800">Save 21%</span>
                            <h3 class="text-lg font-semibold text-gray-900">Premium</h3>
                            <p class="mt-2 text-4xl font-bold text-gray-900">$15.00<span class="text-xl font-medium text-gray-500">/mo</span></p>
                            <p class="mt-1 text-sm text-gray-500">For growing businesses.</p>
                            <button class="mt-6 w-full rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                                Switch to Premium
                            </button>
                        </div>

                        <!-- Pro Plan (Current) -->
                        <div class="border-2 border-gray-900 rounded-xl p-6 relative">
                            <span class="absolute top-0 -translate-y-1/2 inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-800">Current Plan</span>
                            <h3 class="text-lg font-semibold text-gray-900">Pro</h3>
                            <p class="mt-2 text-4xl font-bold text-gray-900">$45.00<span class="text-xl font-medium text-gray-500">/mo</span></p>
                            <p class="mt-1 text-sm text-gray-500">For power users.</p>
                            <button class="mt-6 w-full rounded-md border border-transparent bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm cursor-not-allowed opacity-60">
                                Currently Selected
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Billing History Card -->
                <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                    <div class="px-6 py-5">
                        <h2 class="text-lg font-semibold text-gray-900">Billing History</h2>
                        <p class="mt-1 text-sm text-gray-500">Review your past invoices and payments.</p>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" class="relative px-6 py-3">
                                        <span class="sr-only">Invoice</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 3, 2024</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Pro Plan - Monthly</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$45.00</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Paid</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href="#" class="text-gray-600 hover:text-gray-900">Download</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Nov 3, 2024</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Pro Plan - Monthly</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$45.00</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Paid</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href="#" class="text-gray-600 hover:text-gray-900">Download</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Oct 3, 2024</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Pro Plan - Monthly</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$45.00</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Paid</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href="#" class="text-gray-600 hover:text-gray-900">Download</a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Danger Zone Card -->
                <div class="bg-white shadow-sm ring-1 ring-red-900/10 rounded-xl">
                    <div class="px-6 py-5">
                        <h2 class="text-lg font-semibold text-red-800">Danger Zone</h2>
                        <p class="mt-1 text-sm text-gray-500">Manage your subscription cancellation.</p>
                    </div>
                    <div class="border-t border-gray-200 px-6 py-6 flex items-center justify-between">
                        <div>
                            <h3 class="font-medium text-gray-900">Cancel Subscription</h3>
                            <p class="text-sm text-gray-500">All services will be stopped at the end of your billing cycle.</p>
                        </div>
                        <button id="open-cancel-modal" type="button" class="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                            Cancel Subscription
                        </button>
                    </div>
                </div>

            </div>
        </div>

    </div>

    <!-- ====== Confirmation Modal ====== -->
    <div id="cancel-modal" class="relative z-50 hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div id="modal-backdrop" class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <!-- Modal Panel -->
                <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div class="sm:flex sm:items-start">
                            <!-- Warning Icon -->
                            <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">Cancel Subscription</h3>
                                <div class="mt-2">
                                    <p class="text-sm text-gray-500">Are you sure you want to cancel your subscription? This action cannot be undone. All your services will be stopped at the end of your current billing cycle on <span class="font-medium text-gray-700">Dec 3, 2025</span>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button id="confirm-cancel" type="button" class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto">
                            Yes, Cancel Subscription
                        </button>
                        <button id="close-cancel-modal" type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                            Nevermind
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const tabs = document.querySelectorAll('.tab-button');
            const panels = document.querySelectorAll('[role="tabpanel"]');

            // Find the initially active tab
            let activeTab = document.querySelector('.tab-button.active-tab');

            tabs.forEach(tab => {
                tab.addEventListener('click', function (e) {
                    e.preventDefault();
                    
                    // Don't do anything if it's already active
                    if (tab === activeTab) {
                        return;
                    }

                    // --- Update Tab Styles ---
                    // Deactivate all tabs
                    tabs.forEach(t => {
                        t.classList.remove('active-tab', 'text-gray-900', 'border-gray-900');
                        t.classList.add('inactive-tab', 'text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
                        t.setAttribute('aria-selected', 'false');
                    });

                    // Activate the clicked tab
                    tab.classList.add('active-tab', 'text-gray-900', 'border-gray-900');
                    tab.classList.remove('inactive-tab', 'text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
                    tab.setAttribute('aria-selected', 'true');
                    
                    activeTab = tab; // Update the active tab reference

                    // --- Update Content Panels ---
                    const targetId = tab.getAttribute('data-tab-target');
                    
                    // Hide all panels
                    panels.forEach(panel => {
                        panel.classList.add('hidden');
                    });

                    // Show the target panel
                    const targetPanel = document.getElementById(targetId);
                    if (targetPanel) {
                        targetPanel.classList.remove('hidden');
                    }
                });
            });

            // --- Modal Logic ---
            const modal = document.getElementById('cancel-modal');
            const openModalBtn = document.getElementById('open-cancel-modal');
            const closeModalBtn = document.getElementById('close-cancel-modal');
            const backdrop = document.getElementById('modal-backdrop');
            const confirmCancelBtn = document.getElementById('confirm-cancel');

            const showModal = () => {
                if (modal) modal.classList.remove('hidden');
            };

            const hideModal = () => {
                if (modal) modal.classList.add('hidden');
            };

            if (openModalBtn) {
                openModalBtn.addEventListener('click', showModal);
            }
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', hideModal);
            }
            if (backdrop) {
                backdrop.addEventListener('click', hideModal);
            }

            if (confirmCancelBtn) {
                confirmCancelBtn.addEventListener('click', () => {
                    // Add your cancellation logic here
                    console.log("Subscription cancellation confirmed.");
                    hideModal();
                    // For demo, we'll just hide the modal.
                    // In a real app, you'd make an API call here.
                });
            }

        });
    </script>

</body>
</html>

