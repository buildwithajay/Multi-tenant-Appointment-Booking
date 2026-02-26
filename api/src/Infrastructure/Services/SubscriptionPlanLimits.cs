using api.src.Domain.Enums;

namespace api.src.Infrastructure.Services;

public static class SubscriptionPlanLimits
{
    public static int? GetMaxStaff(SubscriptionPlan plan) => plan switch
    {
        SubscriptionPlan.Starter => 1,
        SubscriptionPlan.Growth => 5,
        SubscriptionPlan.Enterprise => null,
        _ => 1
    };

    public static int? GetMonthlyBookingLimit(SubscriptionPlan plan) => plan switch
    {
        SubscriptionPlan.Starter => 50,
        SubscriptionPlan.Growth => null,
        SubscriptionPlan.Enterprise => null,
        _ => 50
    };
}
