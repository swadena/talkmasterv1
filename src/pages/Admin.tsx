import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const navigate = useNavigate();
  const { user, credits, loading, isAdmin, isPremiumOverride, setIsPremiumOverride } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      navigate("/");
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    setChecked(isPremiumOverride);
  }, [isPremiumOverride]);

  if (loading || !user || !isAdmin) {
    return null;
  }

  const handleToggle = (value: boolean) => {
    setChecked(value);
    setIsPremiumOverride(value);
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Email:</span> {user.email}</p>
          <p><span className="font-medium text-foreground">Credits:</span> {credits}</p>
          <p><span className="font-medium text-foreground">Premium Override:</span> {checked ? "ON" : "OFF"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="premium-override" className="text-sm font-medium text-foreground">
              Premium Override
            </Label>
            <Switch
              id="premium-override"
              checked={checked}
              onCheckedChange={handleToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            When ON, all premium features are unlocked regardless of payment status. This is an in-memory toggle for this session only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
