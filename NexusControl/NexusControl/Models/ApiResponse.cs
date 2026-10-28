using System;
using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    public class ApiResponse<T>
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = "error";

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("data")]
        public T? Data { get; set; }

        [JsonIgnore]
        public bool IsSuccess => string.Equals(Status, "success", StringComparison.OrdinalIgnoreCase);

        public static ApiResponse<T> Success(T? data, string? message = null) => new()
        {
            Status = "success",
            Data = data,
            Message = message
        };

        public static ApiResponse<T> Error(string message, T? data = default) => new()
        {
            Status = "error",
            Message = message,
            Data = data
        };
    }
}
