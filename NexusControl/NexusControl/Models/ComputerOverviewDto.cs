using System;
using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    public class ComputerOverviewDto
    {
        [JsonPropertyName("computerId")]
        public int ComputerId { get; set; }

        [JsonPropertyName("computerName")]
        public string? ComputerName { get; set; }

        [JsonPropertyName("ipAddress")]
        public string? IpAddress { get; set; }

        [JsonPropertyName("macAddress")]
        public string? MacAddress { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("memberId")]
        public int? MemberId { get; set; }

        [JsonPropertyName("currentUsername")]
        public string? CurrentUsername { get; set; }

        [JsonPropertyName("sessionStartedAt")]
        public DateTime? SessionStartedAt { get; set; }

        [JsonPropertyName("zoneName")]
        public string? ZoneName { get; set; }

        [JsonPropertyName("hourlyRate")]
        public decimal? HourlyRate { get; set; }

        [JsonPropertyName("remainingMinutes")]
        public int? RemainingMinutes { get; set; }

        [JsonPropertyName("hasActiveCombo")]
        public bool HasActiveCombo { get; set; }
    }
}
