using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    public sealed class MachineSocketDto
    {
        [JsonPropertyName("machineId")]
        public string? MachineId { get; set; }

        [JsonPropertyName("localIp")]
        public string? LocalIp { get; set; }

        [JsonPropertyName("macAddress")]
        public string? MacAddress { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("currentUser")]
        public string? CurrentUser { get; set; }

        [JsonPropertyName("memberId")]
        public int? MemberId { get; set; }

        [JsonPropertyName("sessionStartedAt")]
        public System.DateTime? SessionStartedAt { get; set; }
    }
}
