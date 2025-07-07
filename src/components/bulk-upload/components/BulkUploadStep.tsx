
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import BulkPhotoUpload from '../BulkPhotoUpload';

interface BulkUploadStepProps {
  photos: File[];
  isGrouping: boolean;
  onPhotosUploaded: (photos: File[]) => void;
  onStartGrouping: () => void;
  onBack: () => void;
}

const BulkUploadStep = ({
  photos,
  isGrouping,
  onPhotosUploaded,
  onStartGrouping,
  onBack
}: BulkUploadStepProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BulkPhotoUpload
          onPhotosUploaded={onPhotosUploaded}
          maxPhotos={100}
        />
        {photos.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {photos.length} photos uploaded
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button 
                onClick={onStartGrouping}
                disabled={isGrouping}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGrouping ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Grouping...
                  </>
                ) : (
                  'Start AI Grouping'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUploadStep;
