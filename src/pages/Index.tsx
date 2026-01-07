import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface FileItem {
  file: File;
  path: string;
  selected: boolean;
  isDirectory?: boolean;
}

const Index = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [archiveName, setArchiveName] = useState('archive');
  const [compressionLevel, setCompressionLevel] = useState([6]);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const folders = new Set<string>();
    selectedFiles.forEach((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');
      
      for (let i = 0; i < parts.length - 1; i++) {
        const folderPath = parts.slice(0, i + 1).join('/');
        folders.add(folderPath);
      }
    });

    const folderItems: FileItem[] = Array.from(folders).map((folderPath) => ({
      file: new File([], folderPath),
      path: folderPath,
      selected: true,
      isDirectory: true,
    }));

    const fileItems: FileItem[] = selectedFiles.map((file) => ({
      file,
      path: file.webkitRelativePath || file.name,
      selected: true,
      isDirectory: false,
    }));

    const allItems = [...folderItems, ...fileItems].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.path.localeCompare(b.path);
    });

    setFiles(allItems);
    toast.success(`Загружено: ${folders.size} папок и ${fileItems.length} файлов`);
  };

  const toggleFileSelection = (index: number) => {
    setFiles((prev) => {
      const item = prev[index];
      const newSelected = !item.selected;

      return prev.map((fileItem, i) => {
        if (i === index) {
          return { ...fileItem, selected: newSelected };
        }
        
        if (item.isDirectory && fileItem.path.startsWith(item.path + '/')) {
          return { ...fileItem, selected: newSelected };
        }

        return fileItem;
      });
    });
  };

  const handleCreateArchive = async () => {
    const selectedFiles = files.filter((f) => f.selected);
    
    if (selectedFiles.length === 0) {
      toast.error('Выберите хотя бы один файл');
      return;
    }

    if (!archiveName.trim()) {
      toast.error('Введите название архива');
      return;
    }

    setIsCreating(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const compressionOption = {
        compression: 'DEFLATE' as const,
        compressionOptions: { level: compressionLevel[0] },
      };

      selectedFiles.forEach((fileItem) => {
        if (!fileItem.isDirectory) {
          zip.file(fileItem.path, fileItem.file);
        }
      });

      const blob = await zip.generateAsync(
        {
          type: 'blob',
          ...compressionOption,
        },
        (metadata) => {
          setProgress(metadata.percent);
        }
      );

      saveAs(blob, `${archiveName}.zip`);
      toast.success('Архив успешно создан!');
      setProgress(100);
    } catch (error) {
      toast.error('Ошибка при создании архива');
      console.error(error);
    } finally {
      setTimeout(() => {
        setIsCreating(false);
        setProgress(0);
      }, 1000);
    }
  };

  const getCompressionLabel = (level: number) => {
    if (level <= 3) return 'Быстрое';
    if (level <= 6) return 'Стандартное';
    return 'Максимальное';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 pt-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Icon name="Archive" size={40} className="text-primary" />
            <h1 className="text-4xl font-bold text-slate-800">Архивировать папку</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Создавайте архивы быстро и легко прямо в браузере
          </p>
        </div>

        <Card className="shadow-lg border-0 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Upload" size={24} className="text-primary" />
              Загрузка файлов
            </CardTitle>
            <CardDescription>
              Выберите файлы или папки для архивации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              webkitdirectory=""
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
              className="w-full h-24 text-lg hover:scale-105 transition-transform"
            >
              <Icon name="FolderOpen" size={28} className="mr-3" />
              Выбрать папку
            </Button>

            {files.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">
                    Выбрано: {files.filter((f) => f.selected).length} из {files.length}
                  </span>
                  <span className="text-sm text-slate-600">
                    {formatFileSize(
                      files
                        .filter((f) => f.selected)
                        .reduce((acc, f) => acc + f.file.size, 0)
                    )}
                  </span>
                </div>
                {files.map((fileItem, index) => {
                  const depth = fileItem.path.split('/').length - 1;
                  const isFolder = fileItem.isDirectory;
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 hover:bg-white rounded transition-colors"
                      style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    >
                      <Checkbox
                        checked={fileItem.selected}
                        onCheckedChange={() => toggleFileSelection(index)}
                      />
                      <Icon
                        name={isFolder ? 'Folder' : 'File'}
                        size={18}
                        className={isFolder ? 'text-amber-500' : 'text-slate-400'}
                      />
                      <span className={`text-sm flex-1 truncate ${isFolder ? 'font-medium' : ''}`}>
                        {fileItem.path.split('/').pop()}
                      </span>
                      {!isFolder && (
                        <span className="text-xs text-slate-500">
                          {formatFileSize(fileItem.file.size)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Settings" size={24} className="text-primary" />
              Настройки архива
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="archiveName" className="text-base">
                Название архива
              </Label>
              <Input
                id="archiveName"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="Введите название..."
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Уровень сжатия</Label>
                <span className="text-sm font-medium text-primary">
                  {getCompressionLabel(compressionLevel[0])}
                </span>
              </div>
              <Slider
                value={compressionLevel}
                onValueChange={setCompressionLevel}
                min={0}
                max={9}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Быстрое (0)</span>
                <span>Стандартное (6)</span>
                <span>Максимальное (9)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isCreating && (
          <Card className="shadow-lg border-0 animate-fade-in">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Создание архива...</span>
                  <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleCreateArchive}
          disabled={files.length === 0 || isCreating}
          size="lg"
          className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Icon name="Download" size={24} className="mr-3" />
          {isCreating ? 'Создание архива...' : 'Создать и скачать ZIP'}
        </Button>
      </div>
    </div>
  );
};

export default Index;