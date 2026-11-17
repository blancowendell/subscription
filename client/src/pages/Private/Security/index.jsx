import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import {
  showErrorToast,
  showSuccessToast,
} from "../../../components/ActionsCenter/Alerts/Sileo";
import FloatingInput from "../../../components/Forms/FloatingInput";
import SecurityAPI from "../../../api/private/security/securityAPI";

const SecurityPage = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showErrorToast("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await SecurityAPI.editUsernamePassword(
        username,
        currentPassword,
        password,
        confirmPassword
      );

      if (response.msg === "success") {
        showSuccessToast("Credentials updated successfully!");
        navigate("/index");
      } else {
        showErrorToast(response.msg || "Failed to update credentials");
      }
    } catch (err) {
      showErrorToast(
        err.response?.data?.msg || "Failed to update credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const devices = [
    { id: 1, name: "Dell 24”", location: "London, UK", date: "May 12, 2023" },
    { id: 2, name: "Macbook Air", location: "London, UK", date: "May 12, 2023" },
    { id: 3, name: "iPhone 14 Pro Max", location: "London, UK", date: "May 12, 2023" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex justify-center items-center p-6 transition-colors duration-300">
      <div className="bg-white dark:bg-[#111827] border border-transparent dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Left Side - Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: "var(--main-color)" }}>
              Change Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Update your account credentials to keep your profile secure.
            </p>
          </div>

          <div className="space-y-5">
            <FloatingInput
              id="username"
              label="New Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <FloatingInput
              id="currentPassword"
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <FloatingInput
              id="password"
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <FloatingInput
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full h-12 rounded-xl font-bold transition-all shadow-md"
            style={{
              backgroundColor: "var(--main-color)",
              border: "none",
              color: "white",
            }}
          >
            {loading ? "Updating..." : "Update Security Settings"}
          </Button>
        </form>

        {/* Right Side - Devices */}
        <div className="flex flex-col h-full border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-10 md:pt-0 md:pl-10">
          <h2 className="text-2xl font-black mb-1" style={{ color: "var(--main-color)" }}>
            Your Devices
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Managed active sessions across your hardware.
          </p>

          <Button
            type="default"
            className="mb-8 w-full h-11 rounded-xl font-bold transition-all border-2
                       bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 
                       text-red-500 border-red-500 hover:border-red-600"
          >
            Log Out From All Devices
          </Button>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 
                           bg-slate-50 dark:bg-slate-900/50 hover:border-[var(--main-color)] transition-all"
              >
                <div>
                  <p className="font-bold text-gray-800 dark:text-slate-200 group-hover:text-[var(--main-color)] transition-colors">
                    {device.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    {device.location} • {device.date}
                  </p>
                </div>
                <Button 
                  size="small" 
                  type="text" 
                  className="font-bold text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
                >
                  Terminate
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;