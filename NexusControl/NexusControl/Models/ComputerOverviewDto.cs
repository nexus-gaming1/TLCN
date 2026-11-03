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

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("currentUsername")]
        public string? CurrentUsername { get; set; }

        [JsonPropertyName("sessionStartedAt")]
        public DateTime? SessionStartedAt { get; set; }

        [JsonPropertyName("zoneName")]
        public string? ZoneName { get; set; }

        [JsonPropertyName("hourlyRate")]
        public decimal? HourlyRate { get; set; }

        [JsonPropertyName("hasActiveCombo")]
        public bool HasActiveCombo { get; set; }
    }
}
