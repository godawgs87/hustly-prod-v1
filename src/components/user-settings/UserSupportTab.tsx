
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, MessageCircle, Book, FileText } from 'lucide-react';

const UserSupportTab = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <HelpCircle className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Support & Resources</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Help Documentation</Label>
          <p className="text-sm text-gray-600 mb-3">Access guides and tutorials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <Book className="w-4 h-4" />
                  <span className="font-medium">Getting Started Guide</span>
                </div>
                <p className="text-sm text-gray-600">Learn the basics of Hustly</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Platform Integrations</span>
                </div>
                <p className="text-sm text-gray-600">Connect eBay, Mercari & more</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <Book className="w-4 h-4" />
                  <span className="font-medium">Pricing Strategies</span>
                </div>
                <p className="text-sm text-gray-600">Maximize your profits</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center space-x-2 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">FAQ</span>
                </div>
                <p className="text-sm text-gray-600">Common questions answered</p>
              </div>
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Contact Support</Label>
          <p className="text-sm text-gray-600 mb-3">Get help from our support team</p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" placeholder="Brief description of your issue" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="support-message">Message</Label>
              <Textarea 
                id="support-message" 
                placeholder="Please describe your issue in detail..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="support-priority">Priority</Label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="low">Low - General question</option>
                <option value="medium">Medium - Feature request</option>
                <option value="high">High - Technical issue</option>
                <option value="urgent">Urgent - Critical problem</option>
              </select>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Feature Requests</Label>
          <p className="text-sm text-gray-600 mb-3">Suggest new features or improvements</p>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Bulk photo editing tools</p>
                <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
              </div>
              <p className="text-sm text-gray-600">Ability to edit multiple photos at once</p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Advanced analytics dashboard</p>
                <Badge variant="secondary">Under Review</Badge>
              </div>
              <p className="text-sm text-gray-600">More detailed sales and performance metrics</p>
            </div>
            
            <Button variant="outline" className="w-full">
              Submit New Feature Request
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Tutorial Preferences</Label>
          <p className="text-sm text-gray-600 mb-3">Customize your learning experience</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show tooltips for new features</Label>
                <p className="text-sm text-gray-600">Get guided tours of new functionality</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekly tips email</Label>
                <p className="text-sm text-gray-600">Receive helpful tips and tricks</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Video tutorials</Label>
                <p className="text-sm text-gray-600">Prefer video over text tutorials</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserSupportTab;
