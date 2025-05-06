'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("全局错误边界捕获到错误:", error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-destructive">
         <CardHeader className="bg-destructive text-destructive-foreground p-4 rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            发生错误
          </CardTitle>
         </CardHeader>
        <CardContent className="p-6 space-y-4">
          <CardDescription className="text-lg text-foreground">
            抱歉，应用程序遇到问题。
          </CardDescription>
           {error?.message && (
             <div className="bg-muted p-3 rounded border border-border">
               <p className="text-sm font-mono text-muted-foreground break-all">
                  <strong>错误详情:</strong> {error.message}
               </p>
              {error.digest && <p className="text-xs text-muted-foreground/70 mt-1">Digest: {error.digest}</p>}
             </div>
           )}
          <p className="text-sm text-muted-foreground">
            您可以尝试重新加载页面。如果问题仍然存在，请联系支持。
          </p>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
             className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
