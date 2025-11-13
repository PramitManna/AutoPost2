'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePublicIds, setImagePublicIds] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Get connection data from URL params (from callback)
  const accessToken = searchParams.get('accessToken');
  const pageId = searchParams.get('pageId'); 
  const userName = searchParams.get('userName');
  const igBusinessId = searchParams.get('igBusinessId');

  // Auto-detect post type based on number of uploaded images
  const postType = uploadedImages.length > 1 ? 'multiple' : 'single';

  // Helper function to delete images from Cloudinary after successful posting
  const cleanupImages = async (publicIds: string[]) => {
    console.log('🧹 Cleaning up uploaded images from Cloudinary...');
    
    for (const publicId of publicIds) {
      try {
        const response = await fetch(`/api/upload/delete?publicId=${encodeURIComponent(publicId)}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Deleted image ${publicId} from Cloudinary:`, data.result);
        } else {
          const errorData = await response.json();
          console.warn(`⚠️ Failed to delete ${publicId}:`, errorData.error);
        }
      } catch (error) {
        console.warn(`⚠️ Network error deleting ${publicId}:`, error);
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setUploadedImages(fileArray);
    setResult("📤 Processing and uploading images...");

    // Convert images to URLs for preview and posting
    const urls: string[] = [];
    const publicIds: string[] = [];
    const warnings: string[] = [];
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      try {
        setResult(`� Processing image ${i + 1}/${fileArray.length} with Sharp...`);
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          urls.push(data.url);
          publicIds.push(data.filename); // filename contains the public_id
          
          if (data.warning) {
            warnings.push(data.warning);
          }
          
          console.log(`✅ Image ${i + 1} processed and uploaded:`, {
            url: data.url,
            publicId: data.filename,
            size: `${(data.size / 1024 / 1024).toFixed(2)}MB`,
            dimensions: data.dimensions,
            provider: data.provider
          });
        } else {
          const errorData = await response.json();
          console.error(`❌ Upload failed for image ${i + 1}:`, errorData.error);
          setResult(`❌ Upload failed for image ${i + 1}: ${errorData.error}`);
          return;
        }
      } catch (error) {
        console.error(`❌ Upload error for image ${i + 1}:`, error);
        setResult(`❌ Network error uploading image ${i + 1}`);
        return;
      }
    }
    
    setImageUrls(urls);
    setImagePublicIds(publicIds);
    
    if (warnings.length > 0) {
      setResult(`⚠️ ${warnings[0]} Images are ready for posting.`);
    } else {
      setResult(`✅ ${urls.length} image${urls.length > 1 ? 's' : ''} processed and uploaded successfully!`);
    }
  };

  const clearImages = async (shouldCleanup = false) => {
    // Optionally cleanup images from Cloudinary if requested
    if (shouldCleanup && imagePublicIds.length > 0) {
      console.log('🧹 Cleaning up images during manual clear...');
      await cleanupImages(imagePublicIds);
    }
    
    setUploadedImages([]);
    setImageUrls([]);
    setImagePublicIds([]);
    setCaption('');
    setGeneratedCaption('');
    setShowPreview(false);
  };

  // Auto-generate caption using AI
  const generateCaption = async () => {
    if (uploadedImages.length === 0) {
      setResult("❌ Please upload images first");
      return;
    }

    setIsGeneratingCaption(true);
    setResult("🤖 Analyzing images and generating description...");

    try {
      const formData = new FormData();
      uploadedImages.forEach((file, index) => {
        formData.append(`image${index}`, file);
      });

      const response = await fetch('/api/analyseImage', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCaption(data.description);
        setCaption(data.description);
        setResult(`✅ Caption generated successfully! You can edit it before posting.`);
        setShowPreview(true);
      } else {
        const errorData = await response.json();
        setResult(`❌ Caption generation failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Caption generation error:', error);
      setResult("❌ Network error generating caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const postToFacebook = async () => {
    if (!pageId || !accessToken) {
      setResult("❌ Missing connection data");
      return;
    }

    if (imageUrls.length === 0) {
      setResult("❌ Please upload at least one image");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (postType === 'single') {
        const res = await fetch("/api/social/publish-facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageUrls[0],
            caption: caption,
            pageId,
            accessToken,
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          const link = `https://facebook.com/${data.postId.replace("_", "/posts/")}`;
          setResult(`✅ Posted to Facebook! Cleaning up temporary files...`);
          
          // Clean up images from Cloudinary after successful posting
          await cleanupImages(imagePublicIds);
          setResult(link);
          console.log('✅ Facebook post published and images cleaned up');
        } else {
          setResult("❌ Failed to publish: " + JSON.stringify(data.error));
        }
      } else {
        const res = await fetch("/api/social/publish-facebook-multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrls: imageUrls,
            caption: caption,
            pageId,
            accessToken,
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          const link = `https://facebook.com/${data.postId.replace("_", "/posts/")}`;
          setResult(`✅ Facebook carousel posted! Cleaning up temporary files...`);
          
          // Clean up images from Cloudinary after successful posting
          await cleanupImages(imagePublicIds);
          setResult(link);
          console.log('✅ Facebook carousel post published and images cleaned up');
        } else {
          setResult("❌ Failed to publish: " + JSON.stringify(data.error));
        }
      }
    } catch (err) {
      setResult("❌ Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };



    const postToInstagram = async () => {
    if (!imageUrls.length) return;

    // Check if using local URLs (which won't work with Instagram) but allow ngrok URLs
    const isLocalUrl = imageUrls[0].includes('localhost') || imageUrls[0].includes('127.0.0.1');
    const isNgrokUrl = imageUrls[0].includes('ngrok-free.dev') || imageUrls[0].includes('ngrok.io');
    
    if (isLocalUrl && !isNgrokUrl) {
      setResult("⚠️ Instagram requires publicly accessible URLs. Please start ngrok with 'ngrok http 3000' or deploy your app.");
      return;
    }

    setLoading(true);
    setResult("📤 Publishing to Instagram...");
    
    try {
      let response;
      
      if (postType === 'single') {
        response = await fetch('/api/social/publish-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: imageUrls[0], 
            caption: caption || "🚀 Automated post from AutoPost! #automation",
            accessToken,
            igBusinessId
          }),
        });
      } else {
        response = await fetch('/api/social/publish-instagram-multiple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrls: imageUrls, 
            caption: caption || "🚀 Automated post from AutoPost! #automation",
            accessToken,
            igBusinessId
          }),
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Posted to Instagram! Cleaning up temporary files...`);
        
        // Clean up images from Cloudinary after successful posting
        await cleanupImages(imagePublicIds);
        setResult(`✅ Posted to Instagram successfully! Post ID: ${data.postId || data.mediaId}`);
        console.log(`✅ Instagram ${postType} post published and images cleaned up`);
      } else {
        setResult(`❌ Instagram posting failed: ${data.error}`);
      }
    } catch (error) {
      setResult("❌ Network error posting to Instagram");
      console.error('Instagram posting error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (connected === 'true') {
    return (
      <main className="flex flex-col items-center justify-center h-screen space-y-4">
        <h1 className="text-3xl font-semibold">Connected with FB and Insta </h1>
        <p className="text-lg">
          Welcome {userName}! Your accounts are successfully linked!
        </p>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Connection Details:</h3>
          <p className="text-sm text-gray-600">Facebook Page ID: {pageId}</p>
          {igBusinessId && <p className="text-sm text-gray-600">Instagram Business ID: {igBusinessId}</p>}
        </div>

        <div className="flex flex-col space-y-4 w-full max-w-md">
          {/* Image Upload Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3">Upload Images</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {/* <p className="text-xs text-gray-500">
                  � Large images will be automatically compressed. Supports JPG, PNG, GIF.
                </p> */}
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} selected
                      {postType === 'multiple' && ' (Carousel)'}
                    </span>
                    <button
                      onClick={() => clearImages(false)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {/* Auto-detected post type indicator */}
                  <div className="p-2 bg-blue-100 rounded text-sm text-blue-800">
                    📝 Auto-detected: <strong>{postType === 'single' ? 'Single Image' : 'Multiple Images (Carousel)'}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Caption Generator */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">🤖 AI Caption Generator</h4>
              {generatedCaption && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Generated</span>
              )}
            </div>
            <button
              onClick={generateCaption}
              disabled={isGeneratingCaption || uploadedImages.length === 0 || imageUrls.length === 0}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 font-medium"
            >
              {isGeneratingCaption ? "🔄 Analyzing Images..." : "✨ Generate Caption with AI"}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              AI will analyze your images and create a professional property description
            </p>
          </div>

          {/* Caption Input/Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">Caption</h4>
              {generatedCaption && (
                <button
                  onClick={() => setCaption(generatedCaption)}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Reset to AI version
                </button>
              )}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption here or generate one with AI..."
              rows={4}
              className="text-black w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              {caption.length} characters
            </p>
          </div>

          {/* Preview Section */}
          {showPreview && caption && imageUrls.length > 0 && (
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <h4 className="font-bold text-blue-900 mb-3">📱 Post Preview</h4>
              <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                  <div>
                    <p className="font-semibold text-sm">{userName || 'Your Page'}</p>
                    <p className="text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">{caption}</p>
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imageUrls.length === 1 ? (
                  <img 
                    src={imageUrls[0]} 
                    alt="Preview" 
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {imageUrls.slice(0, 4).map((url, idx) => (
                      <div key={idx} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {idx === 3 && imageUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <span className="text-white text-xl font-bold">
                              +{imageUrls.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Facebook Posting */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-bold text-blue-900 mb-2">Facebook</h4>
            <button
              onClick={postToFacebook}
              disabled={loading || !pageId || !accessToken || imageUrls.length === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Posting..." : `Post ${postType === 'single' ? 'Image' : 'Album'} to Facebook`}
            </button>
          </div>

          {/* Instagram Posting */}
          <div className="border rounded-lg p-4 bg-pink-50">
            <h4 className="font-bold text-pink-900 mb-2">Instagram</h4>
            {igBusinessId ? (
              <button
                onClick={postToInstagram}
                disabled={loading || !igBusinessId || !accessToken || imageUrls.length === 0}
                className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400"
              >
                {loading ? "Posting..." : `Post ${postType === 'single' ? 'Image' : 'Carousel'} to Instagram`}
              </button>
            ) : (
              <div className="text-sm text-gray-500 p-3 bg-gray-100 rounded">
                ⚠️ Instagram not connected. Please connect your Instagram Business account to your Facebook page.
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="text-center text-sm mt-4 max-w-md">
            {result.startsWith("http") ? (
              <a
                href={result}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                ✅ View Post on Facebook
              </a>
            ) : (
              <span className="text-red-500 break-all">{result}</span>
            )}
          </div>
        )}
      </main>
    );
  }

  if (error === 'no_page') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Facebook Page Required</h3>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              {message}
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">How to create a Facebook Page:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Go to <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer" className="underline">facebook.com/pages/create</a></li>
                <li>Choose &quot;Business or Brand&quot;</li>
                <li>Enter your page name and category</li>
                <li>Complete the setup process</li>
                <li>Come back and connect again</li>
              </ol>
            </div>
            
            <div className="mt-6 space-y-3">
              <a
                href="https://www.facebook.com/pages/create"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Facebook Page
              </a>
              <div>
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again After Creating Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Welcome!</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Facebook and Instagram accounts to start posting.
          </p>
          
          <div className="mt-6">
            <a
              href={`${process.env.NEXT_PUBLIC_META_OAUTH_URL}?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_META_REDIRECT_URI || '')}&scope=pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect Meta Accounts
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
