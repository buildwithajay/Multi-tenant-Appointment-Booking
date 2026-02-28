using System.Text;
using api.Application.Interfaces.Auth;
using api.Domain.Models;
using api.Infrastructure.Data;
using api.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using api.src.Application.Interfaces;
using api.src.Infrastructure.Repositories;
using Microsoft.OpenApi.Models;
using Microsoft.CodeAnalysis.Options;
using api.src.Infrastructure.Identity;
using api.src.Infrastructure.Services;
using api.src.Infrastructure.Background;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
{
   var connectionString = ConnectionStringResolver.ResolveDefaultConnection(builder.Configuration);
   options.UseNpgsql(connectionString);
});
builder.Services.AddIdentityCore<User>(options =>
{
   options.Password.RequireDigit = true;
   options.Password.RequireLowercase = true;
   options.Password.RequireNonAlphanumeric = true;
   options.Password.RequireUppercase = true;
   options.Password.RequiredLength = 6;
   options.User.RequireUniqueEmail = true;
}).AddRoles<ApplicationRoles>()
.AddEntityFrameworkStores<AppDbContext>()
.AddSignInManager()
.AddDefaultTokenProviders();
builder.Services.AddAuthentication(option =>
{
    option.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    option.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
   options.TokenValidationParameters = new TokenValidationParameters
   {
      ValidateIssuer = true,
      ValidateAudience = true,
      ValidateIssuerSigningKey = true,
      ValidIssuer = builder.Configuration["Jwt:Issuer"],
      ValidAudience = builder.Configuration["Jwt:Audience"],
      IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
   };
});
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IServiceManager, ServiceManager>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IPublicBookingService, PublicBookingService>();
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection(StripeOptions.SectionName));
builder.Services.Configure<SendGridOptions>(builder.Configuration.GetSection(SendGridOptions.SectionName));
builder.Services.AddSingleton<ISendGridEmailSender, SendGridEmailSender>();
builder.Services.AddSingleton<IBookingNotificationQueue, BookingNotificationQueue>();
builder.Services.AddHostedService<BookingNotificationWorker>();
builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
    {
       policy
    .WithOrigins(
        "https://jolly-sea-00f9eb200.1.azurestaticapps.net",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173"
    )
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials();
    })
);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token like: Bearer {your token}"
    });
     options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
    
});
var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
if (app.Environment.IsDevelopment())
{
 
   app.UseSwagger();
   app.UseSwaggerUI();
  
}
if (!app.Environment.IsDevelopment())
{
   app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallback(async context =>
{
   context.Response.StatusCode = StatusCodes.Status404NotFound;
   context.Response.ContentType = "application/json";
   var payload = JsonSerializer.Serialize(new
   {
      statusCode = 404,
      message = $"Route not found: {context.Request.Path}"
   });
   await context.Response.WriteAsync(payload);
});
app.Run();
