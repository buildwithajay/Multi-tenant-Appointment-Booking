namespace api.src.Application.DTOs.TenantDto;

public record  WorkingHoursDto
{
    public DayScheduleDto Monday { get; set; } = new();
    public DayScheduleDto Tuesday { get; set; } = new();
    public DayScheduleDto Wednesday { get; set; } = new();
    public DayScheduleDto Thursday { get; set; } = new();
    public DayScheduleDto Friday { get; set; } = new();
    public DayScheduleDto Saturday { get; set; } = new();
    public DayScheduleDto Sunday { get; set; } = new();

}
public class DayScheduleDto
{
    public bool IsOpen { get; set; } = true;
    public TimeSpan? OpenTime { get; set; } = new TimeSpan(9, 0, 0);  // 9:00 AM
    public TimeSpan? CloseTime { get; set; } = new TimeSpan(17, 0, 0); // 5:00 PM
}
