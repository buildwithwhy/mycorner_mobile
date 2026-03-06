import { useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface UsePhotoManagementReturn {
  handleAddPhoto: () => void;
  handleDeletePhoto: (uri: string) => void;
}

export function usePhotoManagement(
  neighborhoodId: string,
  addNeighborhoodPhoto: (id: string, uri: string) => void,
  removeNeighborhoodPhoto: (id: string, uri: string) => void,
  requireAuth: (feature: string, callback: () => void) => void,
): UsePhotoManagementReturn {
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isMountedRef.current) return;

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!isMountedRef.current) return;

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhoodId, result.assets[0].uri);
    }
  }, [neighborhoodId, addNeighborhoodPhoto]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (!isMountedRef.current) return;

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!isMountedRef.current) return;

    if (!result.canceled) {
      addNeighborhoodPhoto(neighborhoodId, result.assets[0].uri);
    }
  }, [neighborhoodId, addNeighborhoodPhoto]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      { text: 'Take Photo', onPress: () => requireAuth('photos', takePhoto) },
      { text: 'Choose from Library', onPress: () => requireAuth('photos', pickImage) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [requireAuth, takePhoto, pickImage]);

  const handleDeletePhoto = useCallback((uri: string) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNeighborhoodPhoto(neighborhoodId, uri) },
    ]);
  }, [neighborhoodId, removeNeighborhoodPhoto]);

  return { handleAddPhoto, handleDeletePhoto };
}
