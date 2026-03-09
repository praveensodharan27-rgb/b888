'use client';

import { useEffect, useState } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Select, { ActionMeta, SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';
import api from '@/lib/api';

interface Specification {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  order: number;
  options?: SpecificationOption[];
  customValues?: string[];
}

interface SpecificationOption {
  id: string;
  value: string;
  label?: string;
}

export interface AttributeField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
}

interface CategoryAttributesProps {
  categorySlug?: string;
  subcategorySlug?: string;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

// Define attributes for each category/subcategory
const categoryAttributes: Record<string, Record<string, AttributeField[]>> = {
  mobiles: {
    'mobile-phones': [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Samsung, Apple, Xiaomi' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., iPhone 15, Galaxy S24' },
      { name: 'storage_gb', label: 'Storage (GB)', type: 'number', required: true, placeholder: 'e.g., 64, 128, 256' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', required: true, placeholder: 'e.g., 4, 6, 8' },
      { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Blue, Red' },
      { name: 'imei_count', label: 'IMEI Count', type: 'number', required: false, placeholder: '1 or 2' },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'accessories_included', label: 'Accessories Included', type: 'multiselect', required: false, options: ['Charger', 'Earphones', 'Case', 'Screen Protector', 'Box'] },
      { name: 'network', label: 'Network', type: 'select', required: false, options: ['4G', '5G', 'LTE'] },
      { name: 'release_year', label: 'Release Year', type: 'number', required: false, placeholder: 'e.g., 2023, 2024' },
    ],
    'tablets': [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Apple, Samsung, Lenovo' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., iPad Pro, Galaxy Tab' },
      { name: 'storage_gb', label: 'Storage (GB)', type: 'number', required: true, placeholder: 'e.g., 64, 128, 256' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', required: false, placeholder: 'e.g., 4, 6, 8' },
      { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Silver, Space Gray' },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'accessories_included', label: 'Accessories Included', type: 'multiselect', required: false, options: ['Charger', 'Case', 'Screen Protector', 'Box', 'Stylus'] },
      { name: 'network', label: 'Network', type: 'select', required: false, options: ['WiFi Only', '4G', '5G', 'LTE'] },
      { name: 'screen_size', label: 'Screen Size (inches)', type: 'number', required: false, placeholder: 'e.g., 10.2, 11, 12.9' },
    ],
    'smart-watches': [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Apple, Samsung, Fitbit' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Apple Watch Series 9' },
      { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Silver, Gold' },
      { name: 'case_size', label: 'Case Size (mm)', type: 'number', required: false, placeholder: 'e.g., 40, 42, 44, 45' },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'accessories_included', label: 'Accessories Included', type: 'multiselect', required: false, options: ['Charger', 'Band', 'Box'] },
      { name: 'battery_life', label: 'Battery Life (days)', type: 'number', required: false, placeholder: 'e.g., 1, 2, 7' },
    ],
    'accessories': [
      { name: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Apple, Samsung' },
      { name: 'type', label: 'Accessory Type', type: 'text', required: true, placeholder: 'e.g., Charger, Case, Earphones' },
      { name: 'compatible_with', label: 'Compatible With', type: 'text', required: false, placeholder: 'e.g., iPhone 15, Galaxy S24' },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
    ],
  },
  'electronics-appliances': {
    'tvs': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., LED, OLED, QLED' },
      { name: 'screen_size_inch', label: 'Screen Size (inches)', type: 'number', required: true },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['Smart TV', '4K', 'HDR', 'WiFi', 'Bluetooth', 'USB', 'HDMI'] },
    ],
    'laptops': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Gaming, Business, Ultrabook' },
      { name: 'screen_size_inch', label: 'Screen Size (inches)', type: 'number', required: true },
      { name: 'capacity', label: 'Storage/Memory', type: 'text', required: true, placeholder: 'e.g., 512GB SSD, 1TB HDD' },
      { name: 'ram_gb', label: 'RAM (GB)', type: 'number', required: true },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['Touchscreen', 'Backlit Keyboard', 'Fingerprint', 'Webcam', 'DVD Drive'] },
    ],
    'cameras': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', required: true, options: ['DSLR', 'Mirrorless', 'Point & Shoot', 'Action Camera'] },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['WiFi', 'Bluetooth', '4K Video', 'Image Stabilization', 'Waterproof'] },
    ],
    'home-appliances': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Washing Machine, Refrigerator, AC' },
      { name: 'capacity', label: 'Capacity', type: 'text', required: false, placeholder: 'e.g., 7kg, 200L' },
      { name: 'energy_rating', label: 'Energy Rating', type: 'select', required: false, options: ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star'] },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['Inverter', 'Smart Control', 'Auto Clean', 'Quick Wash', 'Energy Efficient'] },
    ],
    'kitchen-appliances': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Microwave, Mixer, Oven' },
      { name: 'capacity', label: 'Capacity', type: 'text', required: false, placeholder: 'e.g., 20L, 1000W' },
      { name: 'energy_rating', label: 'Energy Rating', type: 'select', required: false, options: ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star'] },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['Digital Display', 'Timer', 'Auto Shut-off', 'Non-stick', 'Dishwasher Safe'] },
    ],
    'gaming-consoles': [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Sony, Microsoft, Nintendo' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., PS5, Xbox Series X, Switch' },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Console, Handheld' },
      { name: 'storage_gb', label: 'Storage (GB)', type: 'number', required: false },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: ['none', 'manufacturer', 'seller'] },
      { name: 'features', label: 'Features', type: 'multiselect', required: false, options: ['4K Gaming', 'VR Ready', 'Backward Compatible', 'Online Gaming', 'Controller Included'] },
    ],
  },
  vehicles: {
    'cars': [
      { name: 'make', label: 'Make', type: 'text', required: true, placeholder: 'e.g., Maruti, Hyundai, Honda' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Swift, i20, City' },
      { name: 'variant', label: 'Variant', type: 'text', required: false, placeholder: 'e.g., VDI, ZXI' },
      { name: 'year', label: 'Year', type: 'number', required: true, placeholder: 'e.g., 2020' },
      { name: 'kms_driven', label: 'KMs Driven', type: 'number', required: true },
      { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] },
      { name: 'transmission', label: 'Transmission', type: 'select', required: true, options: ['Manual', 'Automatic', 'AMT', 'CVT'] },
      { name: 'owners', label: 'Owners', type: 'number', required: true, placeholder: 'e.g., 1, 2, 3' },
      { name: 'registration_city', label: 'Registration City', type: 'text', required: true },
      { name: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'rc_available', label: 'RC Available', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
    ],
    'motorcycles': [
      { name: 'make', label: 'Make', type: 'text', required: true, placeholder: 'e.g., Hero, Bajaj, Yamaha' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Splendor, Pulsar, R15' },
      { name: 'variant', label: 'Variant', type: 'text', required: false },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'kms_driven', label: 'KMs Driven', type: 'number', required: true },
      { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Electric'] },
      { name: 'owners', label: 'Owners', type: 'number', required: true },
      { name: 'registration_city', label: 'Registration City', type: 'text', required: true },
      { name: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'rc_available', label: 'RC Available', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
    ],
    'scooters': [
      { name: 'make', label: 'Make', type: 'text', required: true, placeholder: 'e.g., Honda, TVS, Vespa' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Activa, Jupiter, Sprint' },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'kms_driven', label: 'KMs Driven', type: 'number', required: true },
      { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Electric'] },
      { name: 'owners', label: 'Owners', type: 'number', required: true },
      { name: 'registration_city', label: 'Registration City', type: 'text', required: true },
      { name: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'rc_available', label: 'RC Available', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
    ],
    'bicycles': [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Hero, Firefox, BSA' },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'type', label: 'Type', type: 'select', required: false, options: ['Mountain', 'Road', 'Hybrid', 'Electric', 'Kids'] },
      { name: 'year', label: 'Year', type: 'number', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
    'commercial-vehicles': [
      { name: 'make', label: 'Make', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Truck, Van, Bus' },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'kms_driven', label: 'KMs Driven', type: 'number', required: true },
      { name: 'fuel_type', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Diesel', 'CNG', 'Electric'] },
      { name: 'transmission', label: 'Transmission', type: 'select', required: false, options: ['Manual', 'Automatic'] },
      { name: 'registration_city', label: 'Registration City', type: 'text', required: true },
      { name: 'rc_available', label: 'RC Available', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'spare-parts': [
      { name: 'part_name', label: 'Part Name', type: 'text', required: true, placeholder: 'e.g., Engine, Tyre, Battery' },
      { name: 'compatible_with', label: 'Compatible With', type: 'text', required: true, placeholder: 'e.g., Maruti Swift 2020' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
  },
  properties: {
    'apartments': [
      { name: 'property_type', label: 'Property Type', type: 'text', required: false, placeholder: 'e.g., 2BHK, 3BHK' },
      { name: 'sale_type', label: 'Sale Type', type: 'select', required: true, options: ['Rent', 'Sale'] },
      { name: 'area_sqft', label: 'Area (sqft)', type: 'number', required: true },
      { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: true },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: true },
      { name: 'furnished', label: 'Furnished', type: 'select', required: false, options: ['Furnished', 'Semi', 'Unfurnished'] },
      { name: 'floor', label: 'Floor', type: 'number', required: false },
      { name: 'total_floors', label: 'Total Floors', type: 'number', required: false },
      { name: 'parking', label: 'Parking', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'amenities', label: 'Amenities', type: 'multiselect', required: false, options: ['Lift', 'Power Backup', 'Security', 'Parking', 'Gym', 'Swimming Pool', 'Garden', 'Playground'] },
    ],
    'houses': [
      { name: 'property_type', label: 'Property Type', type: 'text', required: false, placeholder: 'e.g., Independent, Villa' },
      { name: 'sale_type', label: 'Sale Type', type: 'select', required: true, options: ['Rent', 'Sale'] },
      { name: 'area_sqft', label: 'Area (sqft)', type: 'number', required: true },
      { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: true },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: true },
      { name: 'furnished', label: 'Furnished', type: 'select', required: false, options: ['Furnished', 'Semi', 'Unfurnished'] },
      { name: 'floors', label: 'Floors', type: 'number', required: false },
      { name: 'parking', label: 'Parking', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'amenities', label: 'Amenities', type: 'multiselect', required: false, options: ['Garden', 'Parking', 'Security', 'Power Backup', 'Water Supply'] },
    ],
    'plots': [
      { name: 'property_type', label: 'Property Type', type: 'text', required: false, placeholder: 'e.g., Residential, Commercial' },
      { name: 'sale_type', label: 'Sale Type', type: 'select', required: true, options: ['Rent', 'Sale'] },
      { name: 'area_sqft', label: 'Area (sqft)', type: 'number', required: true },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
    ],
    'commercial-space': [
      { name: 'property_type', label: 'Property Type', type: 'text', required: false, placeholder: 'e.g., Shop, Office, Warehouse' },
      { name: 'sale_type', label: 'Sale Type', type: 'select', required: true, options: ['Rent', 'Sale'] },
      { name: 'area_sqft', label: 'Area (sqft)', type: 'number', required: true },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'amenities', label: 'Amenities', type: 'multiselect', required: false, options: ['Parking', 'Lift', 'Security', 'Power Backup', 'AC'] },
    ],
    'pg-hostel': [
      { name: 'property_type', label: 'Property Type', type: 'text', required: false, placeholder: 'e.g., PG, Hostel, Dormitory' },
      { name: 'sale_type', label: 'Sale Type', type: 'select', required: true, options: ['Rent'] },
      { name: 'bedrooms', label: 'Bedrooms/Sharing', type: 'text', required: false, placeholder: 'e.g., Single, Double, Triple' },
      { name: 'furnished', label: 'Furnished', type: 'select', required: false, options: ['Furnished', 'Semi', 'Unfurnished'] },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'amenities', label: 'Amenities', type: 'multiselect', required: false, options: ['WiFi', 'Meals', 'Laundry', 'Power Backup', 'Security', 'Parking'] },
    ],
  },
  'home-furniture': {
    'sofa': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Leather, Fabric, Wood' },
      { name: 'dimensions', label: 'Dimensions (LxWxH in cm)', type: 'text', required: false, placeholder: 'e.g., 200x90x85' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'seating_capacity', label: 'Seating Capacity', type: 'number', required: false, placeholder: 'e.g., 3, 4, 5' },
      { name: 'assembly_required', label: 'Assembly Required', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'beds': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Wood, Metal, Upholstered' },
      { name: 'dimensions', label: 'Dimensions (LxWxH in cm)', type: 'text', required: false, placeholder: 'e.g., 200x150x50' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'bed_size', label: 'Bed Size', type: 'select', required: false, options: ['Single', 'Double', 'Queen', 'King'] },
      { name: 'assembly_required', label: 'Assembly Required', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'wardrobe': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Wood, MDF, Steel' },
      { name: 'dimensions', label: 'Dimensions (LxWxH in cm)', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'assembly_required', label: 'Assembly Required', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'tables': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Wood, Glass, Metal' },
      { name: 'dimensions', label: 'Dimensions (LxWxH in cm)', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'year_of_purchase', label: 'Year of Purchase', type: 'number', required: false },
      { name: 'table_type', label: 'Table Type', type: 'text', required: false, placeholder: 'e.g., Dining, Coffee, Study' },
      { name: 'assembly_required', label: 'Assembly Required', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'home-decor': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'item_type', label: 'Item Type', type: 'text', required: false, placeholder: 'e.g., Painting, Vase, Clock' },
    ],
    'lighting': [
      { name: 'item_condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Chandelier, Pendant, Table Lamp' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'wattage', label: 'Wattage', type: 'number', required: false },
    ],
  },
  fashion: {
    'men': [
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Men'] },
      { name: 'size', label: 'Size', type: 'text', required: false, placeholder: 'e.g., S, M, L, XL' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'style', label: 'Style', type: 'text', required: false, placeholder: 'e.g., Casual, Formal, Sports' },
      { name: 'item_type', label: 'Item Type', type: 'text', required: false, placeholder: 'e.g., Shirt, T-Shirt, Jeans' },
    ],
    'women': [
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Women'] },
      { name: 'size', label: 'Size', type: 'text', required: false, placeholder: 'e.g., S, M, L, XL or 36, 38, 40' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'style', label: 'Style', type: 'text', required: false, placeholder: 'e.g., Casual, Formal, Party' },
      { name: 'item_type', label: 'Item Type', type: 'text', required: false, placeholder: 'e.g., Dress, Top, Jeans' },
    ],
    'kids': [
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Boys', 'Girls', 'Unisex'] },
      { name: 'size', label: 'Size', type: 'text', required: false, placeholder: 'e.g., 2Y, 4Y, 6Y' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'age_group', label: 'Age Group', type: 'text', required: false, placeholder: 'e.g., 2-4 years, 5-8 years' },
    ],
    'watches': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'type', label: 'Type', type: 'select', required: false, options: ['Analog', 'Digital', 'Smart Watch'] },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Leather, Metal, Silicone' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Men', 'Women', 'Unisex'] },
    ],
    'jewellery': [
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Necklace, Ring, Earrings' },
      { name: 'material', label: 'Material', type: 'text', required: true, placeholder: 'e.g., Gold, Silver, Diamond' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'footwear': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'size', label: 'Size', type: 'text', required: true, placeholder: 'e.g., 7, 8, 9 or UK 8, US 9' },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Sneakers, Formal, Sports' },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Men', 'Women', 'Unisex'] },
    ],
    'bags': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Handbag, Backpack, Tote' },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Leather, Canvas, Synthetic' },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Men', 'Women', 'Unisex'] },
    ],
  },
  'books-sports-hobbies': {
    'books': [
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Fiction, Non-Fiction, Textbook' },
      { name: 'author', label: 'Author', type: 'text', required: false },
      { name: 'genre', label: 'Genre', type: 'text', required: false, placeholder: 'e.g., Mystery, Romance, Science' },
      { name: 'language', label: 'Language', type: 'text', required: false, placeholder: 'e.g., English, Hindi' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'year', label: 'Year', type: 'number', required: false, placeholder: 'Publication year' },
    ],
    'musical-instruments': [
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Guitar, Piano, Drums' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'year', label: 'Year', type: 'number', required: false },
    ],
    'sports-gear': [
      { name: 'equipment_type', label: 'Equipment Type', type: 'text', required: true, placeholder: 'e.g., Cricket Bat, Football, Tennis Racket' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'size', label: 'Size', type: 'text', required: false },
    ],
    'art-craft': [
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Painting, Sculpture, Craft Kit' },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
    'toys': [
      { name: 'type', label: 'Type', type: 'text', required: false, placeholder: 'e.g., Action Figure, Board Game, Puzzle' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'age_group', label: 'Age Group', type: 'text', required: false, placeholder: 'e.g., 3-5 years, 6-10 years' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
    'collectibles': [
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Coins, Stamps, Action Figures' },
      { name: 'year', label: 'Year', type: 'number', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
  },
  pets: {
    'dogs': [
      { name: 'pet_type', label: 'Pet Type', type: 'select', required: false, options: ['Dog'] },
      { name: 'breed', label: 'Breed', type: 'text', required: true },
      { name: 'age_months', label: 'Age (months)', type: 'number', required: false },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Male', 'Female'] },
      { name: 'vaccinated', label: 'Vaccinated', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'pedigree', label: 'Pedigree', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'microchipped', label: 'Microchipped', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'cats': [
      { name: 'pet_type', label: 'Pet Type', type: 'select', required: false, options: ['Cat'] },
      { name: 'breed', label: 'Breed', type: 'text', required: true },
      { name: 'age_months', label: 'Age (months)', type: 'number', required: false },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Male', 'Female'] },
      { name: 'vaccinated', label: 'Vaccinated', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'pedigree', label: 'Pedigree', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
      { name: 'microchipped', label: 'Microchipped', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'birds': [
      { name: 'pet_type', label: 'Pet Type', type: 'select', required: false, options: ['Bird'] },
      { name: 'breed', label: 'Breed/Species', type: 'text', required: true },
      { name: 'age_months', label: 'Age (months)', type: 'number', required: false },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Male', 'Female', 'Unknown'] },
      { name: 'color', label: 'Color', type: 'text', required: false },
    ],
    'fish': [
      { name: 'pet_type', label: 'Pet Type', type: 'select', required: false, options: ['Fish'] },
      { name: 'breed', label: 'Species', type: 'text', required: true },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false },
      { name: 'tank_size', label: 'Tank Size', type: 'text', required: false },
    ],
    'pet-accessories': [
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Leash, Cage, Food Bowl' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
  },
  services: {
    'repair-services': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., Mobile Repair, Appliance Repair' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'areas_covered', label: 'Areas Covered', type: 'text', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
      { name: 'certifications', label: 'Certifications', type: 'text', required: false },
    ],
    'cleaning': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., House Cleaning, Office Cleaning' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'areas_covered', label: 'Areas Covered', type: 'text', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
    ],
    'beauty-spa': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., Haircut, Massage, Facial' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'areas_covered', label: 'Areas Covered', type: 'text', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
      { name: 'certifications', label: 'Certifications', type: 'text', required: false },
    ],
    'education': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., Tuition, Coaching, Training' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'areas_covered', label: 'Areas Covered', type: 'text', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
      { name: 'qualification', label: 'Qualification', type: 'text', required: false },
    ],
    'events': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., Wedding Planning, Catering, Photography' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
    ],
    'business-services': [
      { name: 'service_type', label: 'Service Type', type: 'text', required: true, placeholder: 'e.g., Accounting, Legal, Consulting' },
      { name: 'provider_type', label: 'Provider Type', type: 'select', required: false, options: ['Individual', 'Company'] },
      { name: 'experience_years', label: 'Experience (years)', type: 'number', required: false },
      { name: 'price_type', label: 'Price Type', type: 'select', required: false, options: ['fixed', 'per_hour', 'per_session'] },
      { name: 'certifications', label: 'Certifications', type: 'text', required: false },
    ],
  },
  jobs: {
    'full-time': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true },
      { name: 'experience_required', label: 'Experience Required (years)', type: 'number', required: false },
      { name: 'salary_min', label: 'Salary Min (₹)', type: 'number', required: false },
      { name: 'salary_max', label: 'Salary Max (₹)', type: 'number', required: false },
      { name: 'salary_type', label: 'Salary Type', type: 'select', required: false, options: ['Monthly', 'Annual', 'Negotiable'] },
      { name: 'qualification', label: 'Qualification', type: 'text', required: false },
      { name: 'skills', label: 'Skills', type: 'text', required: false, placeholder: 'Comma separated' },
      { name: 'company_name', label: 'Company Name', type: 'text', required: false },
      { name: 'location', label: 'Location', type: 'text', required: false },
      { name: 'shift', label: 'Shift', type: 'select', required: false, options: ['Day', 'Night', 'Rotating', 'Flexible'] },
      { name: 'is_remote', label: 'Remote Work', type: 'select', required: false, options: ['Yes', 'No', 'Hybrid'] },
    ],
    'part-time': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true },
      { name: 'experience_required', label: 'Experience Required (years)', type: 'number', required: false },
      { name: 'salary_min', label: 'Salary Min (₹)', type: 'number', required: false },
      { name: 'salary_max', label: 'Salary Max (₹)', type: 'number', required: false },
      { name: 'salary_type', label: 'Salary Type', type: 'select', required: false, options: ['Hourly', 'Daily', 'Monthly', 'Negotiable'] },
      { name: 'qualification', label: 'Qualification', type: 'text', required: false },
      { name: 'skills', label: 'Skills', type: 'text', required: false },
      { name: 'company_name', label: 'Company Name', type: 'text', required: false },
      { name: 'location', label: 'Location', type: 'text', required: false },
      { name: 'shift', label: 'Shift', type: 'select', required: false, options: ['Day', 'Night', 'Flexible'] },
      { name: 'is_remote', label: 'Remote Work', type: 'select', required: false, options: ['Yes', 'No', 'Hybrid'] },
    ],
    'freelance': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true },
      { name: 'experience_required', label: 'Experience Required (years)', type: 'number', required: false },
      { name: 'salary_min', label: 'Rate Min (₹)', type: 'number', required: false },
      { name: 'salary_max', label: 'Rate Max (₹)', type: 'number', required: false },
      { name: 'salary_type', label: 'Rate Type', type: 'select', required: false, options: ['per_hour', 'per_project', 'Negotiable'] },
      { name: 'skills', label: 'Skills', type: 'text', required: false },
      { name: 'is_remote', label: 'Remote Work', type: 'select', required: false, options: ['Yes', 'No', 'Hybrid'] },
    ],
    'internship': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true },
      { name: 'duration', label: 'Duration (months)', type: 'number', required: false },
      { name: 'stipend_min', label: 'Stipend Min (₹)', type: 'number', required: false },
      { name: 'stipend_max', label: 'Stipend Max (₹)', type: 'number', required: false },
      { name: 'qualification', label: 'Qualification', type: 'text', required: false },
      { name: 'skills', label: 'Skills', type: 'text', required: false },
      { name: 'company_name', label: 'Company Name', type: 'text', required: false },
      { name: 'location', label: 'Location', type: 'text', required: false },
      { name: 'is_remote', label: 'Remote Work', type: 'select', required: false, options: ['Yes', 'No', 'Hybrid'] },
    ],
    'contract': [
      { name: 'job_title', label: 'Job Title', type: 'text', required: true },
      { name: 'experience_required', label: 'Experience Required (years)', type: 'number', required: false },
      { name: 'duration', label: 'Contract Duration (months)', type: 'number', required: false },
      { name: 'salary_min', label: 'Salary Min (₹)', type: 'number', required: false },
      { name: 'salary_max', label: 'Salary Max (₹)', type: 'number', required: false },
      { name: 'salary_type', label: 'Salary Type', type: 'select', required: false, options: ['Monthly', 'Negotiable'] },
      { name: 'qualification', label: 'Qualification', type: 'text', required: false },
      { name: 'skills', label: 'Skills', type: 'text', required: false },
      { name: 'company_name', label: 'Company Name', type: 'text', required: false },
      { name: 'location', label: 'Location', type: 'text', required: false },
      { name: 'is_remote', label: 'Remote Work', type: 'select', required: false, options: ['Yes', 'No', 'Hybrid'] },
    ],
  },
  'commercial-industrial': {
    'industrial-machines': [
      { name: 'equipment_type', label: 'Equipment Type', type: 'text', required: true },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'capacity', label: 'Capacity', type: 'text', required: false },
      { name: 'power_rating', label: 'Power Rating', type: 'text', required: false, placeholder: 'e.g., 5HP, 10kW' },
      { name: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'usage_hours', label: 'Usage Hours', type: 'number', required: false },
      { name: 'certifications', label: 'Certifications', type: 'text', required: false },
    ],
    'tools': [
      { name: 'equipment_type', label: 'Tool Type', type: 'text', required: true },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'power_rating', label: 'Power Rating', type: 'text', required: false },
    ],
    'medical-equipment': [
      { name: 'equipment_type', label: 'Equipment Type', type: 'text', required: true },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certifications', label: 'Certifications', type: 'text', required: false },
    ],
    'packaging-machines': [
      { name: 'equipment_type', label: 'Equipment Type', type: 'text', required: true },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'capacity', label: 'Capacity', type: 'text', required: false },
      { name: 'year_of_manufacture', label: 'Year of Manufacture', type: 'number', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
    ],
  },
  'free-stuff': {
    'free-furniture': [
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'pickup_only', label: 'Pickup Only', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
    ],
    'free-electronics': [
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'pickup_only', label: 'Pickup Only', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
    ],
    'misc-free': [
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'pickup_only', label: 'Pickup Only', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false },
      { name: 'available_from', label: 'Available From', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
    ],
  },
  'baby-kids': {
    'clothes': [
      { name: 'age_group', label: 'Age Group', type: 'text', required: false, placeholder: 'e.g., 0-6 months, 2-4 years' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'safety_certified', label: 'Safety Certified', type: 'select', required: false, options: ['Yes', 'No'] },
      { name: 'size', label: 'Size', type: 'text', required: false },
    ],
    'toys': [
      { name: 'age_group', label: 'Age Group', type: 'text', required: false, placeholder: 'e.g., 0-2 years, 3-5 years' },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'safety_certified', label: 'Safety Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'strollers': [
      { name: 'age_group', label: 'Age Group', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'safety_certified', label: 'Safety Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'cribs': [
      { name: 'age_group', label: 'Age Group', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'safety_certified', label: 'Safety Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'kids-furniture': [
      { name: 'age_group', label: 'Age Group', type: 'text', required: false },
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'material', label: 'Material', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'safety_certified', label: 'Safety Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
  },
  'beauty-health': {
    'cosmetics': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Lipstick, Foundation, Mascara' },
      { name: 'expiry_date', label: 'Expiry Date', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'skincare': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Moisturizer, Serum, Cleanser' },
      { name: 'expiry_date', label: 'Expiry Date', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'medical-devices': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., BP Monitor, Glucometer, Nebulizer' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
    'supplements': [
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'text', required: true, placeholder: 'e.g., Protein, Vitamins, Multivitamin' },
      { name: 'expiry_date', label: 'Expiry Date', type: 'text', required: false, placeholder: 'YYYY-MM-DD' },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'certified', label: 'Certified', type: 'select', required: false, options: ['Yes', 'No'] },
    ],
  },
  'other-misc': {
    'agriculture': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'usage_details', label: 'Usage Details', type: 'text', required: false },
    ],
    'office-supplies': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'usage_details', label: 'Usage Details', type: 'text', required: false },
    ],
    'antiques': [
      { name: 'brand', label: 'Brand/Maker', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'year', label: 'Year', type: 'number', required: false },
      { name: 'usage_details', label: 'Usage Details', type: 'text', required: false },
    ],
    'miscellaneous': [
      { name: 'brand', label: 'Brand', type: 'text', required: false },
      { name: 'condition', label: 'Condition', type: 'select', required: false, options: ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'] },
      { name: 'usage_details', label: 'Usage Details', type: 'text', required: false },
    ],
  },
};

export default function CategoryAttributes({ 
  categorySlug, 
  subcategorySlug, 
  register, 
  watch, 
  setValue, 
  errors 
}: CategoryAttributesProps) {
  const [savedValues, setSavedValues] = useState<Record<string, string>>({});

  // Fetch specifications from API
  const { data: specificationsData, isLoading } = useQuery({
    queryKey: ['specifications', categorySlug, subcategorySlug],
    queryFn: async () => {
      if (!categorySlug && !subcategorySlug) return [];
      try {
        const params = new URLSearchParams();
        if (categorySlug) params.append('categorySlug', categorySlug);
        if (subcategorySlug) params.append('subcategorySlug', subcategorySlug);
        // Note: api baseURL already includes /api, so we use /categories/specifications
        const url = `/categories/specifications?${params.toString()}`;
        console.log('📋 Fetching specifications from:', url);
        const response = await api.get(url);
        console.log('📋 Specifications response:', response.data);
        return (response.data?.specifications || []) as Specification[];
      } catch (error: any) {
        // Only log actual errors, not expected 404s when no specs exist
        if (error.response?.status !== 404) {
          console.error('Failed to fetch specifications:', error);
        }
        return [];
      }
    },
    enabled: !!(categorySlug || subcategorySlug),
    retry: false
  });

  // Save custom value when user creates a new option
  const saveCustomValue = async (specificationId: string, value: string) => {
    try {
      // Note: api baseURL already includes /api, so we use /categories/specifications/values
      await api.post('/categories/specifications/values', {
        specificationId,
        value: value.trim()
      });
    } catch (error) {
      // Silently fail - this is not critical for user experience
      if (process.env.NODE_ENV === 'development') {
        console.log('Failed to save custom value (non-critical):', error);
      }
    }
  };

  if (!categorySlug || !subcategorySlug) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading specifications...
      </div>
    );
  }

  const specifications = specificationsData || [];

  // Fallback to hardcoded attributes if no specifications found
  const fallbackAttributes = categoryAttributes[categorySlug]?.[subcategorySlug] || [];
  const useFallback = specifications.length === 0 && fallbackAttributes.length > 0;

  if (specifications.length === 0 && !useFallback) {
    return null;
  }

  const handleSelectChange = (
    spec: Specification,
    selectedOption: SingleValue<{ value: string; label: string }> | null,
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => {
    const fieldName = `attributes.${spec.name}`;
    const value = selectedOption?.value || '';
    
    setValue(fieldName, value);
    
    // If it's a new value (created by user), save it
    if (actionMeta.action === 'create-option' && value) {
      saveCustomValue(spec.id, value);
    }
  };

  const handleMultiSelectChange = (
    spec: Specification,
    selectedOptions: readonly { value: string; label: string }[],
    actionMeta: ActionMeta<{ value: string; label: string }>
  ) => {
    const fieldName = `attributes.${spec.name}`;
    const values = selectedOptions.map(opt => opt.value);
    
    setValue(fieldName, values);
    
    // Save any new values
    if (actionMeta.action === 'create-option' && actionMeta.option) {
      saveCustomValue(spec.id, actionMeta.option.value);
    }
  };

  const handleMultiSelect = (fieldName: string, value: string, checked: boolean) => {
    const currentValue = watch(`attributes.${fieldName}`) || [];
    if (checked) {
      setValue(`attributes.${fieldName}`, [...currentValue, value]);
    } else {
      setValue(`attributes.${fieldName}`, currentValue.filter((v: string) => v !== value));
    }
  };

  // If using fallback (hardcoded attributes)
  if (useFallback) {
    const isVehicleCategory = categorySlug === 'vehicles';
    const vehicleSubcategories = [
      'cars',
      'motorcycles',
      'scooters',
      'bicycles',
      'commercial-vehicles',
    ];
    const isVehicleSpec =
      isVehicleCategory && vehicleSubcategories.includes(subcategorySlug);

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from(
      { length: currentYear - 2000 + 1 },
      (_, idx) => currentYear - idx
    );

    const VEHICLE_COLOUR_OPTIONS = [
      'White',
      'Black',
      'Silver',
      'Grey',
      'Red',
      'Blue',
      'Green',
      'Yellow',
      'Orange',
      'Brown',
      'Beige',
      'Maroon',
      'Gold',
      'Other',
    ] as const;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fallbackAttributes.map((attr) => {
            const fieldName = `attributes.${attr.name}`;
            const error = (errors.attributes as any)?.[attr.name];

            // Vehicle-specific Year field: dropdown 2000 → current year (latest first)
            if (isVehicleSpec && attr.name === 'year') {
              return (
                <div key={attr.name}>
                  <label className="block text-sm font-medium mb-2">
                    {attr.label}{' '}
                    {attr.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    {...register(fieldName, {
                      required: attr.required
                        ? `${attr.label} is required`
                        : false,
                      valueAsNumber: true,
                      validate: (value) => {
                        // Allow empty when not required
                        if (
                          !attr.required &&
                          (value === undefined || Number.isNaN(value))
                        ) {
                          return true;
                        }

                        const numValue =
                          typeof value === 'number'
                            ? value
                            : Number(value ?? NaN);

                        if (Number.isNaN(numValue)) {
                          return `${attr.label} is required`;
                        }

                        if (numValue < 2000 || numValue > currentYear) {
                          return `Year must be between 2000 and ${currentYear}`;
                        }

                        return true;
                      },
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    defaultValue=""
                  >
                    <option value="">Select year</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {error && (
                    <div className="text-red-500 text-sm mt-1">
                      {error.message as string}
                    </div>
                  )}
                </div>
              );
            }

            // Vehicle-specific Colour field: dropdown with common car colours
            if (isVehicleSpec && attr.name === 'color') {
              return (
                <div key={attr.name}>
                  <label className="block text-sm font-medium mb-2">
                    Colour{' '}
                    {attr.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    {...register(fieldName, {
                      required: attr.required
                        ? 'Colour is required'
                        : false,
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    defaultValue=""
                  >
                    <option value="">Select colour</option>
                    {VEHICLE_COLOUR_OPTIONS.map((colour) => (
                      <option key={colour} value={colour}>
                        {colour}
                      </option>
                    ))}
                  </select>
                  {error && (
                    <div className="text-red-500 text-sm mt-1">
                      {error.message as string}
                    </div>
                  )}
                </div>
              );
            }

            if (attr.type === 'select') {
              return (
                <div key={attr.name}>
                  <label className="block text-sm font-medium mb-2">
                    {attr.label} {attr.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    {...register(fieldName, { required: attr.required })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white"
                  >
                    <option value="">Select {attr.label}</option>
                    {attr.options?.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                  {error && (
                    <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                  )}
                </div>
              );
            }

            if (attr.type === 'multiselect') {
              return (
                <div key={attr.name} className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    {attr.label} {attr.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {attr.options?.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(watch(fieldName) || []).includes(option)}
                          onChange={(e) => handleMultiSelect(attr.name, option, e.target.checked)}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                  )}
                </div>
              );
            }

            return (
              <div key={attr.name}>
                <label className="block text-sm font-medium mb-2">
                  {attr.label} {attr.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={attr.type}
                  {...register(fieldName, { 
                    required: attr.required,
                    valueAsNumber: attr.type === 'number'
                  })}
                  placeholder={attr.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {error && (
                  <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render specifications from API
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {specifications.map((spec) => {
          const fieldName = `attributes.${spec.name}`;
          const error = (errors.attributes as any)?.[spec.name];
          const currentValue = watch(fieldName);

          if (spec.type === 'select') {
            // Build options from predefined options and custom values
            const options: { value: string; label: string }[] = [];
            
            // Add predefined options
            if (spec.options) {
              spec.options.forEach(opt => {
                options.push({
                  value: opt.value,
                  label: opt.label || opt.value
                });
              });
            }
            
            // Add custom values
            if (spec.customValues) {
              spec.customValues.forEach(val => {
                if (!options.find(opt => opt.value === val)) {
                  options.push({ value: val, label: val });
                }
              });
            }

            return (
              <div key={spec.id}>
                <label className="block text-sm font-medium mb-2">
                  {spec.label} {spec.required && <span className="text-red-500">*</span>}
                </label>
                <CreatableSelect
                  options={options}
                  value={currentValue ? { value: currentValue, label: currentValue } : null}
                  onChange={(newValue, actionMeta) => handleSelectChange(spec, newValue, actionMeta)}
                  placeholder={spec.placeholder || `Select or type ${spec.label.toLowerCase()}`}
                  isClearable
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: error ? '#ef4444' : base.borderColor,
                    }),
                  }}
                />
                <input
                  type="hidden"
                  {...register(fieldName, { required: spec.required })}
                />
                {error && (
                  <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                )}
              </div>
            );
          }

          if (spec.type === 'multiselect') {
            const options: { value: string; label: string }[] = [];
            
            if (spec.options) {
              spec.options.forEach(opt => {
                options.push({
                  value: opt.value,
                  label: opt.label || opt.value
                });
              });
            }
            
            if (spec.customValues) {
              spec.customValues.forEach(val => {
                if (!options.find(opt => opt.value === val)) {
                  options.push({ value: val, label: val });
                }
              });
            }

            const selectedValues = Array.isArray(currentValue) 
              ? currentValue.map(val => ({ value: val, label: val }))
              : [];

            return (
              <div key={spec.id} className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  {spec.label} {spec.required && <span className="text-red-500">*</span>}
                </label>
                <CreatableSelect
                  isMulti
                  options={options}
                  value={selectedValues}
                  onChange={(newValues, actionMeta) => handleMultiSelectChange(spec, newValues, actionMeta)}
                  placeholder={spec.placeholder || `Select or type ${spec.label.toLowerCase()}`}
                  isClearable
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      borderColor: error ? '#ef4444' : base.borderColor,
                    }),
                  }}
                />
                <input
                  type="hidden"
                  {...register(fieldName, { required: spec.required })}
                />
                {error && (
                  <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
                )}
              </div>
            );
          }

          return (
            <div key={spec.id}>
              <label className="block text-sm font-medium mb-2">
                {spec.label} {spec.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={spec.type}
                {...register(fieldName, { 
                  required: spec.required,
                  valueAsNumber: spec.type === 'number'
                })}
                placeholder={spec.placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {error && (
                <div className="text-red-500 text-sm mt-1">{error.message as string}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

