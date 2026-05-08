# Testing & Integration Guide

## Local Testing

### 1. Install Additional Dependencies
```bash
pip install fastapi uvicorn python-multipart
```

### 2. Run API Locally
```bash
# In the backend/modules/genre_transform/musicgen directory
cd backend/modules/genre_transform/musicgen
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Test Endpoints

#### Health Check
```bash
curl http://localhost:8000/health
```

#### List Available Genres
```bash
curl http://localhost:8000/genres
```

#### Transform Audio
```bash
curl -X POST http://localhost:8000/transform \
  -F "audio_file=@path/to/song.mp3" \
  -F "target_genre=rock" \
  -F "duration=10" \
  -F "start_offset=5" \
  --output output.wav
```

#### Using Postman
1. Create POST request to `http://localhost:8000/transform`
2. Body → form-data:
   - `audio_file`: select file
   - `target_genre`: `rock` (or other)
   - `duration`: `10`
   - `start_offset`: `5`
   - `guidance`: `9.5`
   - `vocal_mix`: `1.5`
   - `instr_mix`: `1.0`
3. Send and download the WAV response

---

## Frontend Integration

### React Native (Expo) Integration

Update your `frontend/VibeShift/app/(tabs)/genre-transform.tsx`:

```typescript
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';

const API_URL = 'http://your-api-endpoint:8000'; // or AWS endpoint

export default function GenreTransformScreen() {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [genre, setGenre] = useState('rock');
  const [duration, setDuration] = useState(10);
  const [startOffset, setStartOffset] = useState(5);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });
      
      if (result.type === 'success') {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error('File picker error:', error);
    }
  };

  const transformGenre = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'audio/mpeg',
        name: selectedFile.name,
      } as any);
      formData.append('target_genre', genre);
      formData.append('duration', duration.toString());
      formData.append('start_offset', startOffset.toString());
      formData.append('guidance', '9.5');
      formData.append('vocal_mix', '1.5');
      formData.append('instr_mix', '1.0');

      const response = await fetch(`${API_URL}/transform`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transform failed');
      }

      // Get the audio data
      const audioBlob = await response.blob();
      const audioUri = URL.createObjectURL(audioBlob);

      // Play or save the audio
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();

    } catch (error) {
      console.error('Transform error:', error);
      Alert.alert('Error', 'Failed to transform audio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick Audio File" onPress={pickAudio} />
      
      {selectedFile && (
        <Text>Selected: {selectedFile.name}</Text>
      )}

      <Picker selectedValue={genre} onValueChange={setGenre}>
        <Picker.Item label="Rock" value="rock" />
        <Picker.Item label="Pop" value="pop" />
        <Picker.Item label="Jazz" value="jazz" />
        {/* Add more genres */}
      </Picker>

      <Button
        title={loading ? "Transforming..." : "Transform Genre"}
        onPress={transformGenre}
        disabled={loading}
      />
    </View>
  );
}
```

### Web Integration (if you add web frontend)

```typescript
const transformAudio = async (file: File, targetGenre: string) => {
  const formData = new FormData();
  formData.append('audio_file', file);
  formData.append('target_genre', targetGenre);
  formData.append('duration', '10');
  formData.append('start_offset', '5');

  const response = await fetch('http://your-api-endpoint:8000/transform', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Transform failed');

  return await response.blob();
};
```

---

## Environment Variables

### Local Development
```bash
# .env or export
VIBESHIFT_API_URL=http://localhost:8000
VIBESHIFT_ENV=development
```

### Production (AWS)
```bash
# EC2 Instance / ECS Task
VIBESHIFT_API_URL=http://your-alb-dns:8000
VIBESHIFT_ENV=production
```

### Frontend Configuration
Update `frontend/VibeShift/app.json` or create a config file:

```json
{
  "apiEndpoints": {
    "development": "http://localhost:8000",
    "staging": "http://staging-api.example.com",
    "production": "http://api.example.com"
  }
}
```

---

## Performance Tuning

### For Better GPU Utilization
- Batch multiple requests if possible
- Use appropriate timeout settings (API has 300s default)
- Monitor GPU memory with: `nvidia-smi`

### Reducing Latency
- Shorter duration values (10-20s is optimal)
- Pre-load model to avoid cold starts
- Use NVIDIA T4 or better (avoid older GPUs)

### Cost Optimization
- Use spot instances for EC2
- Scale down during low traffic
- Cache model weights
- Use S3 for large file storage (avoids memory overhead)

---

## Error Handling

### Common Errors

**"Model not initialized"** (503)
- API still loading, wait 30-60 seconds

**"Duration must be between 0 and 60 seconds"** (400)
- Adjust duration parameter

**"Processing failed"** (500)
- Check logs: `docker logs vibeshift-api`
- Insufficient GPU memory (need 8GB+ for MusicGen)

**GPU Out of Memory**
- Reduce batch size
- Reduce duration
- Use smaller model or upgrade GPU

---

## Monitoring & Logging

### View API Logs
```bash
# If running in Docker
docker logs -f vibeshift-api

# Live logs with timestamps
docker logs -f --timestamps vibeshift-api

# Last 100 lines
docker logs --tail 100 vibeshift-api
```

### CloudWatch Integration (AWS)
```bash
# Add to docker run command
--log-driver awslogs \
--log-opt awslogs-group=/ecs/vibeshift \
--log-opt awslogs-region=us-east-1
```

### Monitoring GPU
```bash
# SSH into EC2 and run
nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader -l 1

# With process information
nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader
```

---

## Scaling in Production

### Horizontal Scaling (Multiple Instances)
1. Create Auto Scaling Group with EC2
2. Place behind Application Load Balancer (ALB)
3. ALB distributes requests across instances

### Vertical Scaling (Larger GPU)
```
T4 (10GB) → A100 (40GB) → More concurrent requests
```

### Using AWS ECS
1. Create task definition with GPU support
2. Deploy as ECS service
3. Configure auto-scaling policies
4. Use Fargate for serverless GPU (when available)

---

## Next Steps

1. **Local Testing:** Run `deploy_local.sh` to test API locally
2. **AWS Setup:** Create EC2 instance
3. **Container Build:** Run `deploy_ecr.sh`
4. **Deploy to EC2:** Run `deploy_ec2.sh <ECR_IMAGE_URL>`
5. **Integration:** Update frontend to call API endpoint
6. **Monitoring:** Setup CloudWatch/logs
