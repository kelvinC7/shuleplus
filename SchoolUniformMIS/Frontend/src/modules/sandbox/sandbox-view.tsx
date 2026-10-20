"use client";

import * as React from "react";
import {
  CalendarIcon,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Caption,
  CardHeading,
  Display,
  ErrorText,
  FieldLabel,
  HelperText,
  PageTitle,
  SecondaryText,
  SectionTitle,
  Subtitle,
  BodyText,
} from "@/components/typography";
import {
  CardListSkeleton,
  Column,
  DataTable,
  EmptyState,
  PageHeader,
  StatCard,
  StatGridSkeleton,
  StatusBadge,
  TableSkeleton,
} from "@/components/shared";
import { brand, semantic, surface } from "@/theme";
import {
  FileText,
  FolderOpen,
  Plus as PlusIcon,
  TrendingUp,
  Users,
} from "lucide-react";

function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>();
  return <DatePicker date={date} onDateChange={setDate} />;
}

function ProgressDemo() {
  const [value, setValue] = React.useState(45);
  React.useEffect(() => {
    const t = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 5)), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full max-w-sm space-y-2">
      <Progress value={value} className="h-2" />
      <p className="text-xs text-muted-foreground">{value}% complete</p>
    </div>
  );
}

function CollapsibleDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-sm">
      <CollapsibleTrigger
        render={<Button variant="outline" className="w-full justify-between" />}
      >
        Toggle Details
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        Collapsible content panel - useful for expandable form sections.
      </CollapsibleContent>
    </Collapsible>
  );
}

type Entry = {
  id: string;
  label: string;
  group?: string;
  render: () => React.ReactNode;
};

type StaffRow = {
  id: string;
  name: string;
  department: string;
  role: string;
  status: string;
};

const STAFF: StaffRow[] = [
  {
    id: "EMP-001",
    name: "Amina Hassan",
    department: "Human Resources",
    role: "HR Manager",
    status: "Active",
  },
  {
    id: "EMP-002",
    name: "John Mwangi",
    department: "Finance",
    role: "Accountant",
    status: "Pending",
  },
  {
    id: "EMP-003",
    name: "Grace Okonkwo",
    department: "IT",
    role: "Developer",
    status: "Active",
  },
  {
    id: "EMP-004",
    name: "Peter Otieno",
    department: "Operations",
    role: "Coordinator",
    status: "Inactive",
  },
  {
    id: "EMP-005",
    name: "Sarah Kimani",
    department: "Finance",
    role: "Analyst",
    status: "Approved",
  },
  {
    id: "EMP-006",
    name: "David Njoroge",
    department: "IT",
    role: "DevOps",
    status: "Completed",
  },
  {
    id: "EMP-007",
    name: "Faith Wanjiru",
    department: "HR",
    role: "Recruiter",
    status: "Rejected",
  },
  {
    id: "EMP-008",
    name: "Brian Kamau",
    department: "Operations",
    role: "Manager",
    status: "Active",
  },
  {
    id: "EMP-009",
    name: "Lucy Achieng",
    department: "Finance",
    role: "Controller",
    status: "Active",
  },
  {
    id: "EMP-010",
    name: "Samuel Mutua",
    department: "IT",
    role: "QA Engineer",
    status: "Pending",
  },
];

const STAFF_COLUMNS: Column<StaffRow>[] = [
  { key: "id", header: "ID", sortable: true, className: "font-medium" },
  { key: "name", header: "Name", sortable: true },
  { key: "department", header: "Department", sortable: true },
  { key: "role", header: "Role" },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
];

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-12 rounded-xl border border-border/60 shadow-soft"
        style={{ background: value }}
      />
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground uppercase">{value}</p>
      </div>
    </div>
  );
}

const COMPONENTS: Entry[] = [
  {
    id: "typography",
    label: "Typography",
    group: "Design System",
    render: () => (
      <div className="w-full space-y-3 text-left">
        <Display>Display 36 / 700</Display>
        <PageTitle>Page Title 30 / 700</PageTitle>
        <SectionTitle>Section Title 24 / 600</SectionTitle>
        <CardHeading>Card Title 20 / 600</CardHeading>
        <Subtitle>Subtitle 18 / 500</Subtitle>
        <BodyText>Body text 16 / 400 - welcome back to ShulePlus.</BodyText>
        <SecondaryText>
          Secondary text 14 / 400 - muted supporting copy.
        </SecondaryText>
        <Caption>CAPTION 11 / 500</Caption>
        <div className="mt-4 space-y-1 border-t pt-4">
          <FieldLabel>Field Label</FieldLabel>
          <HelperText>Helper text explains the field.</HelperText>
          <ErrorText>Error text appears in red.</ErrorText>
        </div>
      </div>
    ),
  },
  {
    id: "color-tokens",
    label: "Color Tokens",
    group: "Design System",
    render: () => (
      <div className="w-full space-y-6 text-left">
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Brand</p>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch name="Primary" value={brand.primary} />
            <ColorSwatch name="Secondary" value={brand.secondary} />
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Semantic</p>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch name="Success" value={semantic.success} />
            <ColorSwatch name="Warning" value={semantic.warning} />
            <ColorSwatch name="Destructive" value={semantic.destructive} />
            <ColorSwatch name="Info" value={semantic.info} />
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">Surface</p>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch name="Background" value={surface.background} />
            <ColorSwatch name="Border" value={surface.border} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "status-badge",
    label: "Status Badge",
    group: "Design System",
    render: () => (
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="Active" />
        <StatusBadge status="Approved" />
        <StatusBadge status="Completed" />
        <StatusBadge status="Pending" />
        <StatusBadge status="Rejected" />
        <StatusBadge status="Inactive" />
      </div>
    ),
  },
  {
    id: "page-header",
    label: "Page Header",
    group: "Design System",
    render: () => (
      <PageHeader
        className="w-full"
        eyebrow="Human Resources"
        title="Staff Directory"
        description="Manage employees, roles, and departments across your organization."
        action={
          <Button>
            <PlusIcon className="mr-1 size-4" />
            Add Staff
          </Button>
        }
      />
    ),
  },
  {
    id: "stat-card",
    label: "Stat Card",
    group: "Design System",
    render: () => (
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <StatCard
          title="Total Staff"
          value="1,254"
          icon={<Users />}
          trend={{ value: "+12", direction: "up" }}
          description="this month"
        />
        <StatCard
          title="Active Contracts"
          value="982"
          icon={<FileText />}
          trend={{ value: "-3%", direction: "down" }}
          description="vs last month"
        />
        <StatCard
          title="Departments"
          value="14"
          icon={<FolderOpen />}
          description="across 3 branches"
        />
        <StatCard
          title="Growth"
          value="8.2%"
          icon={<TrendingUp />}
          trend={{ value: "+1.4%", direction: "up" }}
          description="YoY"
        />
      </div>
    ),
  },
  {
    id: "data-table",
    label: "Data Table",
    group: "Design System",
    render: () => (
      <DataTable
        className="w-full"
        columns={STAFF_COLUMNS}
        data={STAFF}
        getRowId={(row) => row.id}
        searchPlaceholder="Search staff..."
        pageSize={5}
        zebra
      />
    ),
  },
  {
    id: "empty-state",
    label: "Empty State",
    group: "Design System",
    render: () => (
      <EmptyState
        className="w-full"
        title="No records yet"
        description="Get started by creating your first record for this tenant."
        action={
          <Button>
            <PlusIcon className="mr-1 size-4" />
            Create Record
          </Button>
        }
      />
    ),
  },
  {
    id: "loading-skeleton",
    label: "Loading Skeleton",
    group: "Design System",
    render: () => (
      <div className="w-full space-y-8">
        <StatGridSkeleton count={4} />
        <TableSkeleton rows={4} columns={4} />
        <CardListSkeleton count={3} />
      </div>
    ),
  },
  {
    id: "button",
    label: "Button",
    group: "Primitives",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">
          <Plus />
        </Button>
      </div>
    ),
  },
  {
    id: "input",
    label: "Input",
    render: () => (
      <div className="w-full max-w-sm space-y-2">
        <Label htmlFor="demo-input">Full Name</Label>
        <Input id="demo-input" placeholder="Enter your name" />
      </div>
    ),
  },
  {
    id: "textarea",
    label: "Textarea",
    render: () => (
      <div className="w-full max-w-sm space-y-2">
        <Label htmlFor="demo-textarea">Notes</Label>
        <Textarea
          id="demo-textarea"
          placeholder="Write something..."
          rows={4}
        />
      </div>
    ),
  },
  {
    id: "select",
    label: "Select",
    render: () => (
      <div className="w-full max-w-sm space-y-2">
        <Label>Department</Label>
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hr">Human Resources</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
            <SelectItem value="it">IT</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
  },
  {
    id: "checkbox",
    label: "Checkbox",
    render: () => (
      <div className="flex items-center gap-2">
        <Checkbox id="demo-check" />
        <Label htmlFor="demo-check">Accept terms and conditions</Label>
      </div>
    ),
  },
  {
    id: "radio-group",
    label: "Radio Group",
    render: () => (
      <RadioGroup defaultValue="email" className="space-y-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="email" id="demo-email" />
          <Label htmlFor="demo-email">Email</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="sms" id="demo-sms" />
          <Label htmlFor="demo-sms">SMS</Label>
        </div>
      </RadioGroup>
    ),
  },
  { id: "label", label: "Label", render: () => <Label>Example Label</Label> },
  { id: "date-picker", label: "Date Picker", render: () => <DatePickerDemo /> },
  {
    id: "badge",
    label: "Badge",
    render: () => (
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
    ),
  },
  {
    id: "avatar",
    label: "Avatar",
    render: () => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="bg-primary text-primary-foreground">
            SP
          </AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    id: "card",
    label: "Card",
    render: () => (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Total Records</CardTitle>
          <CardDescription>Active tenant records</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">1,284</p>
        </CardContent>
        <CardFooter>
          <Badge>Active</Badge>
        </CardFooter>
      </Card>
    ),
  },
  {
    id: "table",
    label: "Table",
    render: () => (
      <Table className="w-full max-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { id: "REC-001", name: "Annual Report", status: "Published" },
            { id: "REC-002", name: "Staff Directory", status: "Draft" },
          ].map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.id}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>
                <Badge
                  variant={row.status === "Published" ? "default" : "secondary"}
                >
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
  },
  {
    id: "tabs",
    label: "Tabs",
    render: () => (
      <Tabs defaultValue="overview" className="w-full max-w-md">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent
          value="overview"
          className="mt-4 text-sm text-muted-foreground"
        >
          Overview content.
        </TabsContent>
        <TabsContent
          value="analytics"
          className="mt-4 text-sm text-muted-foreground"
        >
          Analytics content.
        </TabsContent>
        <TabsContent
          value="settings"
          className="mt-4 text-sm text-muted-foreground"
        >
          Settings content.
        </TabsContent>
      </Tabs>
    ),
  },
  {
    id: "accordion",
    label: "Accordion",
    render: () => (
      <Accordion className="w-full max-w-md">
        <AccordionItem value="item-1">
          <AccordionTrigger>What is Sample Module?</AccordionTrigger>
          <AccordionContent>
            A reference microservice frontend for ShulePlus.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Brand Colors</AccordionTrigger>
          <AccordionContent>
            Amber #FCB038, Navy #000435, Background #F8FAFC.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    id: "collapsible",
    label: "Collapsible",
    render: () => <CollapsibleDemo />,
  },
  {
    id: "separator",
    label: "Separator",
    render: () => (
      <div className="w-full max-w-sm">
        <p className="text-sm">Above</p>
        <Separator className="my-4" />
        <p className="text-sm">Below</p>
      </div>
    ),
  },
  {
    id: "dialog",
    label: "Dialog",
    render: () => (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open Dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Record</DialogTitle>
            <DialogDescription>
              Add a new record to your tenant workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="record-name">Record Name</Label>
            <Input id="record-name" placeholder="Enter name" />
          </div>
          <DialogFooter>
            <Button>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    id: "alert-dialog",
    label: "Alert Dialog",
    render: () => (
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Delete Item
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  },
  {
    id: "sheet",
    label: "Sheet",
    render: () => (
      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>
          Open Sheet
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Side Panel</SheetTitle>
            <SheetDescription>
              Slide-over panel for quick actions.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Input placeholder="Search..." />
            <Button className="w-full">Apply Filter</Button>
          </div>
        </SheetContent>
      </Sheet>
    ),
  },
  {
    id: "popover",
    label: "Popover",
    render: () => (
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          <CalendarIcon className="mr-2 size-4" />
          Popover
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-sm">Quick info popover with brand styling.</p>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    id: "dropdown-menu",
    label: "Dropdown Menu",
    render: () => (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Dropdown <ChevronDown className="ml-1 size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    id: "tooltip",
    label: "Tooltip",
    render: () => (
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Hover me
        </TooltipTrigger>
        <TooltipContent>ShulePlus tooltip with amber ring</TooltipContent>
      </Tooltip>
    ),
  },
  {
    id: "command",
    label: "Command",
    render: () => (
      <Command className="w-full max-w-md rounded-lg border shadow-sm">
        <CommandInput placeholder="Search modules..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Modules">
            <CommandItem>
              <Search className="mr-2 size-4" />
              Dashboard
            </CommandItem>
            <CommandItem>
              <Search className="mr-2 size-4" />
              Records
            </CommandItem>
            <CommandItem>
              <Search className="mr-2 size-4" />
              Reports
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
  {
    id: "breadcrumb",
    label: "Breadcrumb",
    render: () => (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Sample Module</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Sandbox</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    id: "navigation-menu",
    label: "Navigation Menu",
    render: () => (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[300px] gap-2 p-4">
                <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent">
                  <p className="font-medium">Installation</p>
                  <p className="text-xs text-muted-foreground">
                    Set up shadcn in your module
                  </p>
                </NavigationMenuLink>
                <NavigationMenuLink className="block rounded-md p-2 hover:bg-accent">
                  <p className="font-medium">Theming</p>
                  <p className="text-xs text-muted-foreground">
                    Apply ShulePlus brand colors
                  </p>
                </NavigationMenuLink>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ),
  },
  {
    id: "pagination",
    label: "Pagination",
    render: () => (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ),
  },
  {
    id: "carousel",
    label: "Carousel",
    render: () => (
      <Carousel className="mx-auto w-full max-w-md">
        <CarouselContent>
          {["Amber Primary", "Navy Dark", "Light Background"].map(
            (label, i) => (
              <CarouselItem key={label}>
                <div
                  className="flex aspect-video items-center justify-center rounded-xl text-lg font-semibold"
                  style={{
                    background:
                      i === 0 ? "#fcb038" : i === 1 ? "#000435" : "#f8fafc",
                    color: i === 1 ? "#f8fafc" : "#000435",
                  }}
                >
                  {label}
                </div>
              </CarouselItem>
            ),
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    ),
  },
  { id: "progress", label: "Progress", render: () => <ProgressDemo /> },
  {
    id: "skeleton",
    label: "Skeleton",
    render: () => (
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    ),
  },
];

export function SandboxView() {
  const [selectedId, setSelectedId] = React.useState(COMPONENTS[0].id);
  const [query, setQuery] = React.useState("");

  const filtered = COMPONENTS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = COMPONENTS.find((c) => c.id === selectedId) ?? COMPONENTS[0];

  const groups = React.useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Entry[]>();
    for (const entry of filtered) {
      const group = entry.group ?? "Primitives";
      if (!map.has(group)) {
        map.set(group, []);
        order.push(group);
      }
      map.get(group)!.push(entry);
    }
    return order.map((name) => ({ name, items: map.get(name)! }));
  }, [filtered]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/5 bg-gradient-to-b from-[#000435] to-[#0a0f5c] text-white">
        <div className="border-b border-white/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#fcb038]">
            ShulePlus
          </p>
          <h1 className="mt-1 text-lg font-bold">Design System</h1>
          <p className="mt-1 text-xs text-white/60">
            {COMPONENTS.length} entries
          </p>
        </div>
        <div className="p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter..."
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#fcb038]"
          />
        </div>
        <nav className="max-h-[calc(100vh-9rem)] space-y-4 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <div key={group.name} className="space-y-0.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#fcb038]/70">
                {group.name}
              </p>
              {group.items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-all duration-200 ${
                    c.id === selectedId
                      ? "bg-gradient-to-r from-[#fcb038] to-[#e8a02a] font-semibold text-[#000435] shadow-glow-primary"
                      : "text-white/70 hover:translate-x-0.5 hover:bg-white/10"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Preview */}
      <main className="flex-1 surface-mesh">
        <header className="glass sticky top-0 z-10 border-b border-border/60 px-8 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Preview
          </p>
          <h2 className="text-2xl font-bold text-foreground">
            {selected.label}
          </h2>
        </header>
        <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center p-10">
          <div className="w-full max-w-3xl">
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card/80 p-14 shadow-soft-lg backdrop-blur-sm">
              {selected.render()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
