import { BrowserRouter, Routes, Route } from "react-router-dom";

// AUTH
import GetStarted from "./pages/auth/Get-Started/GetStarted";
import RoleSelection from "./pages/auth/Role-Selection/RoleSelection";
import Login from "./pages/auth/Login/Login";
import Register from "./pages/auth/Registration/Register";
import ForgotPass from "./pages/auth/Forgot-Password/ForgotPass";
import AccountCreated from "./pages/auth/Forgot-Password/AccountCreated";
import Verification from "./pages/auth/Forgot-Password/Verification";
import ResetPassword from "./pages/auth/Forgot-Password/ResetPassword";
import PassChanged from "./pages/auth/Forgot-Password/PassChanged";

// LAYOUT
import DashboardLayout from "./layouts/Dashboard-Layout/DashboardLayout";

// ADMIN
import AdminDashboard from "./pages/admin/Admin-Dashboard/AdminDashboard";
import Orders from "./pages/admin/Admin-Orders/Orders";
import Delivery from "./pages/admin/Admin-Delivery/Delivery";
import Inventory from "./pages/admin/Admin-Inventory/Inventory";
import Expenses from "./pages/admin/Admin-Expenses/Expenses";
import Sales from "./pages/admin/Admin-Sales/Sales";
import CoAssociates from "./pages/admin/users/CoAssociates";
import Customer from "./pages/admin/users/Customer";
import Staff from "./pages/admin/users/Staff";
import Rider from "./pages/admin/users/Rider";

// CO
import CoDashboard from "./pages/co-assoc/Co-Dashboard/CoDashboard";
import CoExpenses from "./pages/co-assoc/Co-Expenses/CoExpenses";
import CoSales from "./pages/co-assoc/Co-Sales/CoSales";
import CoInventory from "./pages/co-assoc/Co-Inventory/CoInventory";

// STAFF
import StaffDashboard from "./pages/staff/Staff-Dashboard/StaffDashboard";
import StaffOrders from "./pages/staff/Staff-Orders/StaffOrders";
import StaffDeliverySchedule from "./pages/staff/Staff-DeliverySchedule/StaffDeliverySchedule";
import StaffInventory from "./pages/staff/Staff-Inventory/StaffInventory";
import StaffSales from "./pages/staff/Staff-Sales/StaffSales";
import StaffCustomers from "./pages/staff/Staff-Customers/StaffCustomers";

// CUSTOMER
import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerRegister from "./pages/customer/CustomerRegister";
import CustomerHome from "./pages/customer/Customer-Home/CustomerHome";
import CustomerAboutUs from "./pages/customer/Customer-AboutUs/CustomerAboutUs";
import CustomerContacts from "./pages/customer/Customer-Contacts/CustomerContacts";
import CustomerDashboard from "./pages/customer/Customer-Dashboard/CustomerDashboard";
import CustomerMakeOrder from "./pages/customer/Customer-MakeOrder/CustomerMakeOrder";
import CustomerTrackOrder from "./pages/customer/Customer-TrackOrder/CustomerTrackOrder";
import CustomerOrderHistory from "./pages/customer/Customer-OrderHistory/CustomerOrderHistory";
import CustomerProfile from "./pages/customer/Customer-Profile/CustomerProfile";

// CUSTOMER AUTH
import CustomerForgotPassword from "./pages/customer/Customer-Auth/CustomerForgotPassword";
import CustomerAccountCreated from "./pages/customer/Customer-Auth/CustomerAccountCreated";
import CustomerPasswordChanged from "./pages/customer/Customer-Auth/CustomerPasswordChanged";
import CustomerVerification from "./pages/customer/Customer-Auth/CustomerVerification";
import CustomerResetPassword from "./pages/customer/Customer-Auth/CustomerResetPassword";

// RIDER
import RiderLogin from "./pages/rider/Rider-Login/RiderLogin";
import RiderHome from "./pages/rider/Rider-Home/RiderHome";
import RiderDeliveries from "./pages/rider/Rider-Deliveries/RiderDeliveries";
import RiderDeliveryDetails from "./pages/rider/Rider-DeliveryDetails/RiderDeliveryDetails";
import RiderHistory from "./pages/rider/Rider-History/RiderHistory";
import RiderProfile from "./pages/rider/Rider-Profile/RiderProfile";
import RiderTopbar from "./pages/rider/Rider-Topbar/RiderTopbar";


import CAboutUs from "./pages/customer/AboutUs/CAboutUs";
import CContactUs from "./pages/customer/ContactUs/CContactUs";

// PROFILES
import MyProfile from "./pages/profile/MyProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* AUTH */}
        <Route path="/" element={<GetStarted />} />
        <Route path="/roles" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/ForgotPass" element={<ForgotPass />} />
        <Route path="/accountcreated" element={<AccountCreated />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-changed" element={<PassChanged />} />

        {/* ADMIN LAYOUT */}
        <Route element={<DashboardLayout role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/delivery" element={<Delivery />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/expenses" element={<Expenses />} />
          <Route path="/admin/sales" element={<Sales />} />
          <Route path="/admin/users/co" element={<CoAssociates />} />
          <Route path="/admin/users/customer" element={<Customer />} />
          <Route path="/admin/users/staff" element={<Staff />} />
          <Route path="/admin/users/rider" element={<Rider />} />

        {/*  ADMIN PROFILE */}
          <Route path="/admin/profile" element={<MyProfile />} />
        </Route>

        {/* CO LAYOUT */}
        <Route element={<DashboardLayout role="co" />}>
          <Route path="/co/dashboard" element={<CoDashboard />} />
          <Route path="/co/expenses" element={<CoExpenses />} />
          <Route path="/co/sales" element={<CoSales />} />
          <Route path="/co/inventory" element={<CoInventory />} />

        {/* CO PROFILE */}
          <Route path="/co/profile" element={<MyProfile />} />
        </Route>

        {/* STAFF */}
       <Route element={<DashboardLayout role="staff" />}>
       <Route path="/staff/dashboard" element={<StaffDashboard />} />
       <Route path="/staff/orders" element={<StaffOrders />} />
       <Route path="/staff/delivery-schedule" element={<StaffDeliverySchedule />} />
       <Route path="/staff/inventory" element={<StaffInventory />} />
       <Route path="/staff/sales" element={<StaffSales />} />
       <Route path="/staff/customers" element={<StaffCustomers />} />

        {/* STAFF PROFILE */}
          <Route path="/staff/profile" element={<MyProfile />} />
        </Route>

        {/* CUSTOMER */}
        <Route path="/customer/customerlogin" element={<CustomerLogin />} />
        <Route path="/customer/customer-register" element={<CustomerRegister />} />
        <Route path="/customer/home" element={<CustomerHome />} />
        <Route path="/customer/aboutus" element={<CustomerAboutUs />} />
        <Route path="/customer/contacts" element={<CustomerContacts />} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/make-order" element={<CustomerMakeOrder />} />
        <Route path="/customer/track-order" element={<CustomerTrackOrder />} />
        <Route path="/customer/order-history" element={<CustomerOrderHistory />} />

        {/* CUSTOMER AUTH */}
        <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
        <Route path="/customer/account-created" element={<CustomerAccountCreated />} />
        <Route path="/customer/reset-password" element={<CustomerResetPassword />} />
        <Route path="/customer/password-changed" element={<CustomerPasswordChanged />} />
        <Route path="/customer/verification" element={<CustomerVerification />} />


        <Route path="/customer/about-us" element={<CAboutUs />} />
        <Route path="/customer/contact-us" element={<CContactUs />} />

        {/* CUSTOMER PROFILE */}
          <Route path="/customer/customerprofile" element={<CustomerProfile />} />

        {/* RIDER */}
          <Route path="/rider/riderlogin" element={<RiderLogin />} />
          <Route path="/rider/home" element={<RiderHome />}/>
          <Route path="/rider/deliveries" element={<RiderDeliveries />}/>
          <Route path="/rider/delivery-details/:id" element={<RiderDeliveryDetails />}/>
          <Route path="/rider/history"element={<RiderHistory />}/>

          {/* RIDER PROFILE */}
          <Route path="/rider/profile" element={<RiderProfile />}/>
      
      </Routes>
    </BrowserRouter>
  );
}

export default App;