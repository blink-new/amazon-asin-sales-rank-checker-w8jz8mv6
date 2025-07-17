import { useState } from 'react'
import { Search, Package, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Alert, AlertDescription } from './components/ui/alert'
import { Badge } from './components/ui/badge'

interface SalesRankData {
  asin: string
  title?: string
  salesRank?: number
  category?: string
  price?: number
  availability?: string
  lowestBuyboxPrice30Days?: number
  lowestBuyboxPriceDate?: string
  lastUpdated?: string
}

function App() {
  const [asin, setAsin] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SalesRankData | null>(null)

  const validateASIN = (asin: string): boolean => {
    // ASIN is typically 10 characters, alphanumeric
    const asinRegex = /^[A-Z0-9]{10}$/
    return asinRegex.test(asin.toUpperCase())
  }

  const formatASIN = (input: string): string => {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    const formattedASIN = formatASIN(asin)
    
    if (!formattedASIN) {
      setError('Please enter an ASIN')
      return
    }

    if (!validateASIN(formattedASIN)) {
      setError('Please enter a valid 10-character ASIN')
      return
    }

    if (!apiKey.trim()) {
      setError('Please enter your Keepa API key')
      return
    }

    setLoading(true)

    try {
      // Keepa API endpoint for product data with history parameter for last 30 days
      const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 60000) // Keepa time format (minutes since epoch)
      const response = await fetch(`https://api.keepa.com/product?key=${apiKey}&domain=1&asin=${formattedASIN}&history=1&since=${thirtyDaysAgo}`)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0]
        
        // Extract sales rank data (Keepa stores historical data in arrays)
        const salesRankHistory = product.csv?.[3] // Sales rank is typically in csv[3]
        let currentSalesRank = null
        
        if (salesRankHistory && salesRankHistory.length > 0) {
          // Get the most recent sales rank (last non-null value)
          for (let i = salesRankHistory.length - 1; i >= 0; i -= 2) {
            if (salesRankHistory[i] !== -1 && salesRankHistory[i] != null) {
              currentSalesRank = salesRankHistory[i]
              break
            }
          }
        }

        // Extract buybox price history (csv[18] is typically buybox price)
        const buyboxPriceHistory = product.csv?.[18] // Buybox price history
        let lowestBuyboxPrice30Days = null
        let lowestBuyboxPriceDate = null
        
        if (buyboxPriceHistory && buyboxPriceHistory.length > 0) {
          let lowestPrice = Infinity
          let lowestPriceTimestamp = null
          
          // Iterate through price history (timestamp, price pairs)
          for (let i = 0; i < buyboxPriceHistory.length; i += 2) {
            const timestamp = buyboxPriceHistory[i]
            const price = buyboxPriceHistory[i + 1]
            
            // Skip invalid prices (-1 means no data)
            if (price !== -1 && price != null && price > 0) {
              if (price < lowestPrice) {
                lowestPrice = price
                lowestPriceTimestamp = timestamp
              }
            }
          }
          
          if (lowestPrice !== Infinity) {
            lowestBuyboxPrice30Days = lowestPrice / 100 // Convert from cents to dollars
            // Convert Keepa timestamp to readable date
            lowestBuyboxPriceDate = new Date((lowestPriceTimestamp + 21564000) * 60000).toLocaleDateString()
          }
        }

        setResult({
          asin: formattedASIN,
          title: product.title || 'Product Title Not Available',
          salesRank: currentSalesRank,
          category: product.categoryTree?.[0]?.name || 'Category Not Available',
          price: product.csv?.[0] ? product.csv[0][product.csv[0].length - 1] / 100 : undefined,
          availability: product.csv?.[2] ? 'In Stock' : 'Availability Unknown',
          lowestBuyboxPrice30Days,
          lowestBuyboxPriceDate,
          lastUpdated: new Date().toLocaleString()
        })
      } else {
        setError('Product not found or invalid ASIN')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data from Keepa API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Amazon ASIN Sales Rank Checker</h1>
              <p className="text-gray-600">Get real-time sales rank data using Keepa API</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Input Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Product Lookup
            </CardTitle>
            <CardDescription>
              Enter an Amazon ASIN and your Keepa API key to retrieve sales rank and pricing information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="asin" className="text-sm font-medium text-gray-700">
                    Amazon ASIN
                  </label>
                  <Input
                    id="asin"
                    type="text"
                    placeholder="e.g., B08N5WRWNW"
                    value={asin}
                    onChange={(e) => setAsin(e.target.value)}
                    className="font-mono"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500">
                    10-character alphanumeric product identifier
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                    Keepa API Key
                  </label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Your Keepa API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Get your API key from <a href="https://keepa.com/#!api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">keepa.com</a>
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching Data...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Sales Rank
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Rank & Pricing Results
              </CardTitle>
              <CardDescription>
                Data retrieved for ASIN: <span className="font-mono font-medium">{result.asin}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Title */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Product Title</h3>
                <p className="text-gray-700">{result.title}</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sales Rank</p>
                      <p className="text-2xl font-bold text-primary">
                        {result.salesRank ? `#${result.salesRank.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary/60" />
                  </div>
                </div>

                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Category</p>
                      <p className="text-lg font-semibold text-accent">
                        {result.category}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-accent/60" />
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Price</p>
                      <p className="text-lg font-semibold text-green-700">
                        {result.price ? `${result.price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {result.availability}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Lowest Price (30 days)</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {result.lowestBuyboxPrice30Days ? `${result.lowestBuyboxPrice30Days.toFixed(2)}` : 'N/A'}
                    </p>
                    {result.lowestBuyboxPriceDate && (
                      <p className="text-xs text-blue-600 mt-1">
                        on {result.lowestBuyboxPriceDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Last updated: {result.lastUpdated}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">How to use this tool</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Find the ASIN on any Amazon product page (usually in the product details section)</li>
                  <li>• Get a free Keepa API key from <a href="https://keepa.com/#!api" target="_blank" rel="noopener noreferrer" className="underline">keepa.com</a></li>
                  <li>• Enter both values above and click "Check Sales Rank"</li>
                  <li>• Sales rank indicates how well a product sells compared to others in its category</li>
                  <li>• The tool also shows the lowest buybox price from the last 30 days for price tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App