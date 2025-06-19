import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCode, Ruler, Box, Clock, CheckCircle, AlertTriangle, Info } from "lucide-react";

export function Guidelines() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">3D Printing Guidelines</h2>
        <p className="text-gray-400">Important information and best practices for successful 3D printing.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* File Requirements */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileCode className="mr-2 h-5 w-5" />
                File Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="text-green-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Accepted formats: .stl, .gcode</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="text-green-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Maximum file size: 50MB per file</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="text-green-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Files must be printable within 200x200x200mm build volume</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="text-yellow-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Ensure models are manifold (watertight)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Design Guidelines */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Ruler className="mr-2 h-5 w-5" />
                Design Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start space-x-2">
                  <Info className="text-cyan-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Minimum wall thickness: 0.8mm</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Info className="text-cyan-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Minimum feature size: 0.4mm</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Info className="text-cyan-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Overhangs beyond 45° require supports</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Info className="text-cyan-500 mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Holes smaller than 3mm may need post-processing</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Quality Tips */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white text-sm mb-2">Orientation Matters</h4>
                  <p className="text-sm text-gray-400">
                    Orient your model to minimize supports and maximize surface quality for visible faces.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm mb-2">Layer Adhesion</h4>
                  <p className="text-sm text-gray-400">
                    Avoid long, thin features that may break along layer lines. Consider print orientation.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm mb-2">Test Prints</h4>
                  <p className="text-sm text-gray-400">
                    For critical dimensions, consider printing a small test piece first.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Material Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Box className="mr-2 h-5 w-5" />
                Available Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">PLA (Recommended)</h4>
                    <Badge variant="secondary" className="bg-green-900 text-green-300">
                      Easy
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Easy to print, biodegradable, good for prototypes and decorative items.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">White</Badge>
                    <Badge variant="outline" className="text-xs">Black</Badge>
                    <Badge variant="outline" className="text-xs">Red</Badge>
                    <Badge variant="outline" className="text-xs">Blue</Badge>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">ABS</h4>
                    <Badge variant="secondary" className="bg-yellow-900 text-yellow-300">
                      Advanced
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Stronger than PLA, better for functional parts, requires heated bed.
                  </p>
                  <Badge variant="outline" className="text-xs">Limited colors</Badge>
                </div>

                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">PETG</h4>
                    <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                      Special Request
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">
                    Chemical resistant, transparent options available. Requires own filament.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Times */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Processing Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Small parts (&lt;2 hours)</span>
                  <Badge variant="secondary" className="bg-green-900 text-green-300">
                    1-2 days
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Medium parts (2-8 hours)</span>
                  <Badge variant="secondary" className="bg-yellow-900 text-yellow-300">
                    3-5 days
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Large parts (&gt;8 hours)</span>
                  <Badge variant="secondary" className="bg-red-900 text-red-300">
                    5-7 days
                  </Badge>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-gray-400">
                    Times are estimates and may vary based on queue length and complexity.
                    Rush orders may be accommodated for urgent events.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Default Print Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Layer Height:</span>
                  <p className="text-white font-medium">0.2mm</p>
                </div>
                <div>
                  <span className="text-gray-400">Infill:</span>
                  <p className="text-white font-medium">20%</p>
                </div>
                <div>
                  <span className="text-gray-400">Supports:</span>
                  <p className="text-white font-medium">Auto-generated</p>
                </div>
                <div>
                  <span className="text-gray-400">Print Speed:</span>
                  <p className="text-white font-medium">60mm/s</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Custom settings can be requested in the special instructions field.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
